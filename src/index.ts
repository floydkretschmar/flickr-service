import dotenv from 'dotenv'
import RestServer from './server';
import { Request, Response } from 'express';
import FlickrApiService from './apiService';
import { query } from 'express-validator'
import moment from 'moment';
import { getPicturesController } from './controllers';

dotenv.config();

const server = new RestServer(process.env.PORT);
server.get("/photos/:albumId", getPicturesController, process.env.REQUESTS_PER_MINUTE)
server.start();