import dotenv from 'dotenv'
import RestServer from './server';
import { getPicturesController } from './controllers';

dotenv.config();

const server = new RestServer(process.env.PORT);
server.get("/photos/:albumId", getPicturesController, process.env.REQUESTS_PER_MINUTE)
server.start();