import { NextApiRequest, NextApiResponse } from 'next';
import { getAdminAdminsData } from '@/components/pages/AdminAdminsPage/AdminAdminsPage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { admins } = await getAdminAdminsData({});
    res.status(200).json(admins);
  } catch (err: unknown) {
    let message = 'Failed to fetch admins';
    if (err instanceof Error) {
      message = err.message;
    } else if (
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      typeof (err as { message?: unknown }).message === 'string'
    ) {
      message = (err as { message: string }).message;
    } else if (typeof err === 'string') {
      message = err;
    }
    res.status(500).json({ error: message });
  }
}
