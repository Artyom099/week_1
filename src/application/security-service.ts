import {DeviceViewModel} from "../types/types";
import {securityRepository} from "../repositories/security-repository";


export const securityService = {
    async finaAllLoginDevicesByUserId(userId: string): Promise<DeviceViewModel[]> {
        return await securityRepository.finaAllLoginDevicesByUserId(userId)
    },

    async findActiveSessionByDeviceId(deviceId: string): Promise<DeviceViewModel | null> {
        return await securityRepository.findActiveSessionByDeviceId(deviceId)
    },

    async deleteActiveSessionByDeviceId(deviceId: string) {
        return await securityRepository.deleteActiveSessionByDeviceId(deviceId)
    }
}