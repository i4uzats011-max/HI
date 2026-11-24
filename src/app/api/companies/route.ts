import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const companies = await db.collection('companies').find({}).sort({ createdAt: -1 }).toArray();

    // Attach branches for each company
    const enrichedCompanies = await Promise.all(
      companies.map(async (c) => {
        const branches = await db.collection('branches').find({ companyId: c._id.toString() }).toArray();
        const voucherCount = await db.collection('vouchers').countDocuments({ companyId: c._id.toString() });
        const partiesCount = await db.collection('party_balances').distinct('partyName', { companyId: c._id.toString() });
        return {
          ...c,
          id: c._id.toString(),
          branches: branches.map(b => ({ ...b, id: b._id.toString() })),
          totalVouchers: voucherCount,
          totalParties: partiesCount.length
        };
      })
    );

    return NextResponse.json({ success: true, companies: enrichedCompanies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, code, description } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Company name is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const existing = await db.collection('companies').findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Company with this name already exists' }, { status: 400 });
    }

    const newCompany = {
      name: name.trim(),
      code: (code || name.trim().substring(0, 4).toUpperCase()).trim(),
      description: (description || '').trim(),
      createdAt: new Date(),
    };

    const result = await db.collection('companies').insertOne(newCompany);

    // Auto-create a default Main Branch if desired
    const defaultBranch = {
      companyId: result.insertedId.toString(),
      name: 'Main Branch / Head Office',
      code: 'HO',
      createdAt: new Date()
    };
    await db.collection('branches').insertOne(defaultBranch);

    return NextResponse.json({
      success: true,
      company: { ...newCompany, id: result.insertedId.toString() }
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
      return NextResponse.json({ success: false, error: 'Company id required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await Promise.all([
      db.collection('companies').deleteOne({ _id: new ObjectId(id) }),
      db.collection('branches').deleteMany({ companyId: id }),
      db.collection('vouchers').deleteMany({ companyId: id }),
      db.collection('party_balances').deleteMany({ companyId: id }),
    ]);

    return NextResponse.json({ success: true, message: 'Company and all associated data deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
