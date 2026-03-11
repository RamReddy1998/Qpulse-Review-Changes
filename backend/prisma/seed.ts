import { PrismaClient, Role } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

interface SeedQuestion {
  "Sno.": number;
  Question: string;
  Option_A: string;
  Option_B: string;
  Option_C: string;
  Option_D: string;
  Answers: string;
  Topics: string;
  certification_name: string;
}

async function main() {
  console.log("🌱 Starting database seed...");

  // -----------------------------
  // 1️⃣ Create Default Users
  // -----------------------------

  const adminPassword = await bcrypt.hash("admin123", 12);
  const learnerPassword = await bcrypt.hash("learner123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Admin user created: ${admin.username}`);

  const learner1 = await prisma.user.upsert({
    where: { username: "learner1" },
    update: {},
    create: {
      username: "learner1",
      passwordHash: learnerPassword,
      role: Role.LEARNER,
    },
  });

  console.log(`✅ Learner user created: ${learner1.username}`);

  const learner2 = await prisma.user.upsert({
    where: { username: "learner2" },
    update: {},
    create: {
      username: "learner2",
      passwordHash: learnerPassword,
      role: Role.LEARNER,
    },
  });

  console.log(`✅ Learner user created: ${learner2.username}`);

  // -----------------------------
  // 2️⃣ Load Questions JSON
  // -----------------------------

  const seedDataPath = path.resolve(__dirname, "seed-data/certifications.json");

  if (!fs.existsSync(seedDataPath)) {
    console.error("❌ Seed data file not found:", seedDataPath);
    return;
  }

  const rawData = fs.readFileSync(seedDataPath, "utf-8");
  const questions: SeedQuestion[] = JSON.parse(rawData);

  console.log(`📚 Loaded ${questions.length} questions from JSON`);

  // -----------------------------
  // 3️⃣ Extract Certifications
  // -----------------------------

  const certNames = new Set<string>();

  for (const q of questions) {
    const name = q.certification_name?.trim();
    if (name) certNames.add(name);
  }

  const certMap = new Map<string, string>();

  for (const name of certNames) {
    const cert = await prisma.certification.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Certification exam preparation for ${name}`,
      },
    });

    certMap.set(name, cert.id);

    console.log(`✅ Certification created: ${name}`);
  }

  // -----------------------------
  // 4️⃣ Insert Questions
  // -----------------------------

  let seededCount = 0;
  let skippedCount = 0;

  for (const q of questions) {
    const certName = q.certification_name?.trim();

    if (!certName || !certMap.has(certName)) {
      skippedCount++;
      continue;
    }

    const certId = certMap.get(certName)!;

    const questionText = q.Question?.trim();

    if (!questionText) {
      skippedCount++;
      continue;
    }

    // Build options object
    const options = {
      A: (q.Option_A || "").trim(),
      B: (q.Option_B || "").trim(),
      C: (q.Option_C || "").trim(),
      D: (q.Option_D || "").trim(),
    };

    const correctAnswer = (q.Answers || "").trim().toUpperCase();

    const topic = (q.Topics || "").trim();

    // -----------------------------
    // Generate Question Hash
    // -----------------------------

    const questionHash = crypto
      .createHash("sha256")
      .update(questionText)
      .digest("hex");

    // -----------------------------
    // Difficulty Detection
    // -----------------------------

    let difficulty = "medium";

    if (questionText.length > 500) difficulty = "hard";
    else if (questionText.length < 200) difficulty = "easy";

    try {
      await prisma.question.upsert({
        where: { questionHash },

        update: {},

        create: {
          certificationId: certId,
          questionText,
          questionHash,
          options,
          correctAnswer,
          difficulty,
          topic,
          source: "seed",
        },
      });

      seededCount++;
    } catch (error) {
      skippedCount++;
    }
  }

  // -----------------------------
  // 5️⃣ Summary
  // -----------------------------

  console.log("\n📊 Seed Summary");
  console.log("-------------------------");
  console.log(`Questions seeded: ${seededCount}`);
  console.log(`Questions skipped: ${skippedCount}`);
  console.log(`Certifications: ${certMap.size}`);
  console.log(`Users created: 3`);
  console.log("-------------------------");

  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });