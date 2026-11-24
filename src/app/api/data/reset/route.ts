import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { type, companyId, branchId } = await req.json();
    const { db } = await connectToDatabase();

    if (type === 'branch' && branchId) {
      await Promise.all([
        db.collection('vouchers').deleteMany({ branchId }),
        db.collection('party_balances').deleteMany({ branchId })
      ]);
      return NextResponse.json({ success: true, message: 'Branch data cleared successfully' });
    }

    if (type === 'company' && companyId) {
      await Promise.all([
        db.collection('vouchers').deleteMany({ companyId }),
        db.collection('party_balances').deleteMany({ companyId })
      ]);
      return NextResponse.json({ success: true, message: 'Company transactions and balances cleared successfully' });
    }

    if (type === 'all') {
      await Promise.all([
        db.collection('vouchers').deleteMany({}),
        db.collection('party_balances').deleteMany({}),
        db.collection('branches').deleteMany({}),
        db.collection('companies').deleteMany({})
      ]);
      return NextResponse.json({ success: true, message: 'All database records reset successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid reset target parameters' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
