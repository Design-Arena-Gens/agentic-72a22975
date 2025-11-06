import { NextRequest } from 'next/server';
import { getLogisticsFiiQuotes } from '../../../lib/fiis';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rpStr = searchParams.get('riskPremium');
  let riskPremium = Number(rpStr);
  if (!Number.isFinite(riskPremium) || riskPremium < 0) riskPremium = 0.03; // 3% default

  const data = await getLogisticsFiiQuotes(riskPremium);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    status: 200,
  });
}
