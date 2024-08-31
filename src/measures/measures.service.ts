import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Measure } from './measure.entitty';
import { Repository } from 'typeorm';
import { Customer } from 'src/customers/customer.entity';
import { CreateMeasureDto } from './dto/create-measure.dto';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
import { ConfirmMeasureDto } from './dto/confirm-measure.dto';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');

@Injectable()
export class MeasuresService {
  constructor(
    @InjectRepository(Measure) private measureRepository: Repository<Measure>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async createMeasure(createMeasureDto: CreateMeasureDto) {
    const { image, customer_code, measure_datetime, measure_type } =
      createMeasureDto;

    const customer = await this.customerRepository.findOneBy({
      id: customer_code,
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const existingMeasure = await this.measureRepository.findOne({
      where: {
        customer: { id: customer_code },
        measureType: measure_type,
        measureDatetime: new Date(measure_datetime),
      },
    });

    if (existingMeasure) {
      throw new HttpException(
        {
          error_code: 'DOUBLE_REPORT',
          error_description: 'Leitura do mês já realizada',
        },
        HttpStatus.CONFLICT,
      );
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `image-${customer_code}.png`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);

    try {
      if (!fs.existsSync(path.join(__dirname, '..', 'uploads'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'uploads'));
      }

      fs.writeFileSync(filePath, buffer);
    } catch (err) {
      console.error('Error al guardar la imagen:', err);
      throw err;
    }

    const configService = new ConfigService();
    const apiKey = configService.get<string>('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    async function uploadToGemini(path, mimeType) {
      const uploadResult = await fileManager.uploadFile(path, {
        mimeType,
        displayName: path,
      });
      const file = uploadResult.file;
      return file;
    }
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain',
    };

    async function run() {
      const files = [await uploadToGemini(filePath, 'image/png')];

      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  mimeType: files[0].mimeType,
                  fileUri: files[0].uri,
                },
              },
              {
                text: 'Necesito que analices la imagen que te paso y me devuelvas la lectura del estado del medidor como un número integer. Por ejemplo "1234". Necesito que tu respuesta sólo me devuelva el numero que surge de la lectura del medidor',
              },
            ],
          },
        ],
      });

      const result = await chatSession.sendMessage(
        'Analiza la imagen y dime la lectura del medidor con formato entero',
      );

      return result.response.text();
    }

    const measureValue = await run();

    const measure = new Measure();
    measure.customer = customer;
    measure.measureDatetime = new Date(measure_datetime);
    measure.measureType = measure_type;
    measure.measureValue = measureValue;
    measure.imageUrl = fileName;

    await this.measureRepository.save(measure);

    return {
      image_url: filePath,
      measure_value: measureValue,
      measure_uuid: measure.id,
    };
  }

  async confirmMeasure(confirmMeasureDto: ConfirmMeasureDto) {
    const { measure_uuid, confirmed_value } = confirmMeasureDto;

    const measure = await this.measureRepository.findOneBy({
      id: measure_uuid,
    });

    if (!measure) {
      throw new HttpException(
        {
          error_code: 'MEASURE_NOT_FOUND',
          error_description: 'Leitura do mês já realizada',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (measure.hasConfirmed) {
      throw new ConflictException({
        error_code: 'CONFIRMATION_DUPLICATE',
        error_description: 'Leitura do mês já realizada',
      });
    }

    measure.measureValue = confirmed_value;
    measure.hasConfirmed = true;

    await this.measureRepository.save(measure);

    fs.rmSync(path.join(__dirname, '..', 'uploads', `${measure.imageUrl}`), {
      force: true,
    });

    return { success: true };
  }

  async getMeasuresByCustomer(customer_code: UUID, measure_type: string) {
    const customer = await this.customerRepository.findOneBy({
      id: customer_code,
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const existMeasures = await this.measureRepository.count({
      where: { customer: { id: customer_code } },
    });

    if (!existMeasures) {
      throw new NotFoundException({
        error_code: 'MEASURES_NOT_FOUND',
        error_description: 'Nenhuma leitura encontrada',
      });
    }

    let query = this.measureRepository
      .createQueryBuilder('measure')
      .leftJoinAndSelect('measure.customer', 'customer')
      .where('customer.id = :customerId', { customerId: customer.id });

    if (measure_type) {
      if (
        measure_type.toUpperCase() !== 'WATER' &&
        measure_type.toUpperCase() !== 'GAS'
      ) {
        throw new BadRequestException({
          error_code: 'INVALID_TYPE',
          error_description: 'Tipo de medição não permitida',
        });
      }
      query = query.andWhere('measure.measureType = :measureType', {
        measureType: measure_type.toUpperCase(),
      });
    }

    const measures = await query.getMany();

    return {
      customer_code: customer.id,
      measures: measures.map((measure) => ({
        measure_uuid: measure.id,
        measure_datetime: measure.measureDatetime,
        measure_type: measure.measureType,
        has_confirmed: measure.hasConfirmed,
        image_url: measure.imageUrl,
      })),
    };
  }

  async getImages(id: UUID) {
    const filePath = path.join(__dirname, '..', 'uploads', `image-${id}.png`);
    if (!fs.existsSync(filePath)) {
      throw new HttpException(
        {
          error_code: 'IMAGE_NOT_FOUND',
          error_description: 'Imagen no encontrada',
        },
        HttpStatus.NOT_FOUND,
      );
    } else {
      return filePath;
    }
  }
}
