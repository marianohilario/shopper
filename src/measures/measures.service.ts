import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Measure } from './measure.entitty';
import { Repository } from 'typeorm';
import { Customer } from 'src/customers/customer.entity';
import { CreateMeasureDto } from './dto/create-measure.dto/create-measure.dto';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { UUID } from 'crypto';
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require('@google/generative-ai');
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
      //   return `Imagen guardada como ${fileName}`;
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
