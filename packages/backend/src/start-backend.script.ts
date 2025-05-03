import {startService} from '@rest-vir/run-service';
import {samplerServiceImplementation} from './service-implementation.js';

await startService(samplerServiceImplementation);
