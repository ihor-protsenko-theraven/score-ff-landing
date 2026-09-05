import { handleAdminVerification } from '../../lib/api.js';

export default function handler(request, response) {
  handleAdminVerification(request, response, {
    adminPassword: process.env.ADMIN_PASSWORD || '',
  });
}
