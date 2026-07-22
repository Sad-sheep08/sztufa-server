import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const where: Prisma.SeasonTeamPlayerWhereInput = {
    OR: [
      { season: { name: { contains: '女' } }, team: { gender: 'MALE' } },
      { season: { name: { contains: '男' } }, team: { gender: 'FEMALE' } },
    ],
  };

  const affected = await prisma.seasonTeamPlayer.count({ where });
  console.log(`Found ${affected} incompatible season roster record(s).`);

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to delete these records.');
    return;
  }

  const result = await prisma.seasonTeamPlayer.deleteMany({ where });
  console.log(`Deleted ${result.count} incompatible season roster record(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
