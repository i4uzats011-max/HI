import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    const { db } = await connectToDatabase();
    const filter = companyId ? { companyId } : {};
    const branches = await db.collection('branches').find(filter).sort({ createdAt: 1 }).toArray();

    const enriched = await Promise.all(
      branches.map(async (b) => {
        const id = b._id.toString();
        const voucherCount = await db.collection('vouchers').countDocuments({ branchId: id });
        const partiesCount = await db.collection('party_balances').countDocuments({ branchId: id });
        const latestVoucher = await db.collection('vouchers').find({ branchId: id }).sort({ date: -1 }).limit(1).toArray();

        return {
          ...b,
          id,
          voucherCount,
          partiesCount,
          lastDate: latestVoucher[0]?.dateStr || null
        };
      })
    );

    return NextResponse.json({ success: true, branches: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyId, name, code } = await req.json();
    if (!companyId || !name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Company ID and Branch Name are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const existing = await db.collection('branches').findOne({
      companyId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'Branch with this name already exists in this company' }, { status: 400 });
    }

    const newBranch = {
      companyId,
      name: name.trim(),
      code: (code || name.trim().substring(0, 3).toUpperCase()).trim(),
      createdAt: new Date()
    };

    const result = await db.collection('branches').insertOne(newBranch);
    return NextResponse.json({
      success: true,
      branch: { ...newBranch, id: result.insertedId.toString(), voucherCount: 0, partiesCount: 0 }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Branch ID required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await Promise.all([
      db.collection('branches').deleteOne({ _id: new ObjectId(id) }),
      db.collection('vouchers').deleteMany({ branchId: id }),
      db.collection('party_balances').deleteMany({ branchId: id }),
    ]);

    return NextResponse.json({ success: true, message: 'Branch and its data deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
