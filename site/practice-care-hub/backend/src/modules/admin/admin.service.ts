import { adminRepository } from "./admin.repository.js";
import { licenseRepository } from "../licenses/license.repository.js";

export const adminService = {
    async getClients() {
        const dentists = await adminRepository.findAllDentists();
        return dentists.map(d => ({
            id: d.id,
            firstName: d.first_name,
            lastName: d.last_name,
            nameArabic: d.name_arabic,
            cin: d.cin,
            email: d.email,
            city: d.city,
            phone: d.phone,
            clinicName: d.clinic_name,
            createdAt: d.created_at,
            license: {
                status: d.license_status || 'none',
                type: d.license_type || 'none',
                activatedAt: d.activated_at,
                expiresAt: d.expires_at
            },
            usesOnline: true // Mocked for now, or could come from a session check
        }));
    },

    async getStats() {
        return await adminRepository.getAdminStats();
    },

    async grantFullLicense(dentistId: string) {
        // Permanent license (null expiresAt)
        return await licenseRepository.upsertActiveLicense(dentistId, 'full', null);
    }
};
