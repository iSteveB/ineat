import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Fruits & Légumes', slug: 'fruits-et-legumes', icon: '🥕' },
  { name: 'Viandes & Poissons', slug: 'viandes-et-poissons', icon: '🥩' },
  { name: 'Produits laitiers', slug: 'produits-laitiers', icon: '🥛' },
  { name: 'Épicerie salée', slug: 'epicerie-salee', icon: '🍝' },
  { name: 'Épicerie sucrée', slug: 'epicerie-sucree', icon: '🍪' },
  { name: 'Surgelés', slug: 'surgeles', icon: '🧊' },
  { name: 'Boissons', slug: 'boissons', icon: '🥤' },
  { name: 'Autres', slug: 'autres', icon: '📦' },
];

async function main() {
  console.log('🌱 Seeding categories...');
  
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  
  console.log('✅ Categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });