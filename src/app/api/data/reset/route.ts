import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { type, companyId, branchId, resetRules } = await req.json();
    const { db } = await connectToDatabase();

    if (type === 'transactions') {
      // Clear vouchers and party_balances across all companies, keeping mappings & groups intact
      await Promise.all([
        db.collection('vouchers').deleteMany({}),
        db.collection('party_balances').deleteMany({})
      ]);
      return NextResponse.json({
        success: true,
        message: 'All transactions cleared. Branch declarations and Ledger groups remain intact for automatic re-application on next upload!'
      });
    }

    if (type === 'branch' && branchId) {
      await Promise.all([
        db.collection('vouchers').deleteMany({ branchId }),
        db.collection('party_balances').deleteMany({ branchId })
      ]);
      return NextResponse.json({
        success: true,
        message: 'Branch transactions cleared successfully. Group and Branch rules are preserved.'
      });
    }

    if (type === 'company' && companyId) {
      await Promise.all([
        db.collection('vouchers').deleteMany({ companyId }),
        db.collection('party_balances').deleteMany({ companyId })
      ]);
      return NextResponse.json({
        success: true,
        message: 'Company transactions and balances cleared successfully. Group and Branch rules are preserved.'
      });
    }

    if (type === 'all') {
      const ops = [
        db.collection('vouchers').deleteMany({}),
        db.collection('party_balances').deleteMany({}),
        db.collection('branches').deleteMany({}),
        db.collection('companies').deleteMany({})
      ];
      if (resetRules) {
        ops.push(db.collection('branch_ledger_mappings').deleteMany({}));
        ops.push(db.collection('ledger_groups').deleteMany({}));
      }
      await Promise.all(ops);
      return NextResponse.json({
        success: true,
        message: resetRules
          ? 'All database records including rules reset successfully'
          : 'All company data reset. Branch code mappings and Ledger groups were preserved!'
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid reset target parameters' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
