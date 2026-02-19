import { requireNativeModule } from 'expo';

import type { EsimProvisioningNativeModule } from './types';

export default requireNativeModule<EsimProvisioningNativeModule>('ExpoEsimProvisioning');
