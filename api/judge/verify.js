import { handleJudgeVerification } from '../../lib/api.js';

export default function handler(request, response) {
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  handleJudgeVerification(request, response, {
    adminPassword,
    judgePassword: process.env.JUDGE_PASSWORD || adminPassword,
  });
}
