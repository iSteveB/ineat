import { SetMetadata } from '@nestjs/common';
import { AccessCapabilities } from '../services/access-policy.service';

export const REQUIRED_CAPABILITIES_KEY = 'requiredCapabilities';
export type RequiredCapability = keyof AccessCapabilities;

export const RequiresCapability = (...capabilities: RequiredCapability[]) =>
  SetMetadata(REQUIRED_CAPABILITIES_KEY, capabilities);
