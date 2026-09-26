import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data into database...');

  // Delete existing demo user if exists
  await prisma.user.deleteMany({
    where: { email: 'demo@example.com' }
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  const secretPasswordHash = await bcrypt.hash('secret123', 10);

  // 1. Create Demo User
  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      passwordHash: passwordHash,
      apiKeys: {
        create: [
          {
            name: 'Production Webhook Key',
            key: 'cmn_sk_demo_9876543210abcdef'
          }
        ]
      },
      webhooks: {
        create: [
          {
            url: 'https://api.myapp.com/webhooks/clicks',
            events: 'link.clicked,link.updated',
            secret: 'whsec_demo_secret_key_12345'
          }
        ]
      }
    }
  });

  console.log(`👤 Created Demo User: ${user.email} (ID: ${user.id})`);

  // 2. Sample Links
  const linkTemplates = [
    {
      code: 'github-repo',
      longUrl: 'https://github.com/facebook/react',
      redirectType: '302',
      clickCount: 142
    },
    {
      code: 'tech-blog',
      longUrl: 'https://news.ycombinator.com',
      redirectType: '302',
      clickCount: 98
    },
    {
      code: 'ai-launch',
      longUrl: 'https://openai.com/index/gpt-4o',
      redirectType: '302',
      clickCount: 215
    },
    {
      code: 'sec-portal',
      longUrl: 'https://cloud.google.com',
      passwordHash: secretPasswordHash,
      redirectType: '302',
      clickCount: 45
    },
    {
      code: 'product-demo',
      longUrl: 'https://v0.dev',
      redirectType: '302',
      clickCount: 180
    },
    {
      code: 'design-system',
      longUrl: 'https://tailwindcss.com',
      redirectType: '302',
      clickCount: 88
    }
  ];

  const countries = [
    { country: 'United States', city: 'San Francisco' },
    { country: 'United States', city: 'New York' },
    { country: 'United Kingdom', city: 'London' },
    { country: 'Germany', city: 'Berlin' },
    { country: 'India', city: 'Bengaluru' },
    { country: 'Japan', city: 'Tokyo' },
    { country: 'Canada', city: 'Toronto' },
    { country: 'France', city: 'Paris' },
    { country: 'Australia', city: 'Sydney' },
    { country: 'Netherlands', city: 'Amsterdam' }
  ];

  const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera'];
  const osList = ['macOS', 'Windows', 'iOS', 'Android', 'Linux'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const referrers = ['Direct', 'Twitter / X', 'LinkedIn', 'Google', 'Reddit', 'Hacker News', 'GitHub', 'ProductHunt'];

  for (const tmpl of linkTemplates) {
    const link = await prisma.link.create({
      data: {
        code: tmpl.code,
        longUrl: tmpl.longUrl,
        passwordHash: tmpl.passwordHash || null,
        redirectType: tmpl.redirectType,
        userId: user.id
      }
    });

    console.log(`🔗 Created Short Link: /${link.code} -> ${link.longUrl}`);

    // Create Analytics
    const analyticsData = [];
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < tmpl.clickCount; i++) {
      const randomTimeOffset = Math.random() * thirtyDaysMs;
      const clickedAt = new Date(now - randomTimeOffset);
      const geo = countries[Math.floor(Math.random() * countries.length)];
      const browser = browsers[Math.floor(Math.random() * browsers.length)];
      const os = osList[Math.floor(Math.random() * osList.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const referrer = referrers[Math.floor(Math.random() * referrers.length)];

      analyticsData.push({
        linkId: link.id,
        clickedAt: clickedAt,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country: geo.country,
        city: geo.city,
        browser: browser,
        os: os,
        device: device,
        referrer: referrer
      });
    }

    await prisma.analytic.createMany({
      data: analyticsData
    });

    console.log(`  📊 Inserted ${analyticsData.length} click telemetry entries for /${link.code}`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
