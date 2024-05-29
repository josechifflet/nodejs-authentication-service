import prisma from '../infra/prisma';

const flushDb = async () => {
  console.log('Flushing prisma...');
  const models = Object.keys(prisma).filter(
    (key) => !['_', '$'].includes(key[0]),
  );
  const promises = models.map((name) => {
    if (name === 'metric')
      return (prisma as any)[name].updateMany({
        where: {},
        data: { value: '0' },
      });
    return (prisma as any)[name].deleteMany();
  });
  await Promise.all(promises);
};

export default flushDb;
