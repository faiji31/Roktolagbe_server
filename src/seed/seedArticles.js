import { connectDB, collections } from "../config/db.js";

async function seedArticles() {
  await connectDB();

  const articles = [
    {
      slug: "who-can-donate-blood-in-bangladesh",
      title: "Who Can Donate Blood? Complete Eligibility Guide",
      summary:
        "Learn the age, weight, hemoglobin, and interval requirements before your next donation.",
      content:
        "Any healthy adult aged 18 to 60 weighing at least 50 kg with hemoglobin above 12.5 g/dL can safely donate whole blood every 90 days.",
      category: "Eligibility",
      isPublished: true,
      createdAt: new Date(),
    },
    {
      slug: "what-to-do-before-and-after-donating",
      title: "What to Eat and Drink Before & After Donating Blood",
      summary:
        "Simple hydration and nutrition steps that prevent dizziness and speed up recovery.",
      content:
        "Drink 500ml of water or oral saline 30 minutes before donating, eat a light non-fatty meal, and avoid heavy lifting for 24 hours afterward.",
      category: "Preparation",
      isPublished: true,
      createdAt: new Date(),
    },
  ];

  for (const article of articles) {
    await collections.articles().updateOne(
      { slug: article.slug },
      { $set: article },
      { upsert: true }
    );
  }

  console.log("Seeded awareness articles.");
  process.exit(0);
}

seedArticles();