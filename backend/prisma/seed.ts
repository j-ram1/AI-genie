import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Check backend/.env");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedTheme(themeId: string, themeName: string, attributeConfigs: any[], personalities: any[]) {
  console.log(`Seeding theme: ${themeName} (${themeId})`);

  await prisma.theme.upsert({
    where: { id: themeId },
    update: { name: themeName },
    create: { id: themeId, name: themeName },
  });

  for (const c of attributeConfigs) {
    await prisma.themeAttributeConfig.upsert({
      where: { themeId_key: { themeId, key: c.key } },
      update: { type: c.type, strength: c.strength, groupId: c.groupId, enabled: true },
      create: { themeId, key: c.key, type: c.type, strength: c.strength, groupId: c.groupId, enabled: true },
    });
  }

  // Clear old personality data for this theme
  const oldPersonalities = await prisma.personality.findMany({ where: { themeId }, select: { id: true } });
  const oldIds = oldPersonalities.map(p => p.id);
  await prisma.personalityAttribute.deleteMany({ where: { personalityId: { in: oldIds } } });
  await prisma.personalityAlias.deleteMany({ where: { personalityId: { in: oldIds } } });
  await prisma.personality.deleteMany({ where: { themeId } });

  for (const p of personalities) {
    const person = await prisma.personality.create({
      data: { themeId, name: p.name },
    });

    for (const a of (p.aliases || [])) {
      await prisma.personalityAlias.create({ data: { personalityId: person.id, alias: a } });
    }

    for (const [key, value] of Object.entries(p.attrs)) {
      const config = attributeConfigs.find(c => c.key === key);
      const type = config?.type || "YESNO";
      await prisma.personalityAttribute.create({
        data: { personalityId: person.id, key, type, value: String(value) },
      });
    }
  }
}

async function main() {
  // --- SPORTS THEME ---
  const sportsConfigs = [
    { key: "gender", type: "YESNO", strength: 1, groupId: "core" },
    { key: "region", type: "YESNO", strength: 2, groupId: "core" },
    { key: "sport", type: "VALUE", strength: 3, groupId: "sport" },
    { key: "active_status", type: "YESNO", strength: 2, groupId: "career" },
    { key: "award_level", type: "YESNO", strength: 3, groupId: "achievement" },
    { key: "world_record", type: "YESNO", strength: 4, groupId: "achievement" },
    { key: "olympic_gold", type: "YESNO", strength: 4, groupId: "achievement" },
    { key: "height_category", type: "VALUE", strength: 2, groupId: "physique" },
    { key: "play_style", type: "VALUE", strength: 5, groupId: "style" },
  ];

  const sportsPeople = [
    { name: "MS Dhoni", aliases: ["Dhoni", "Mahi", "Thala"], attrs: { gender: "YES", region: "YES", sport: "Cricket", active_status: "NO", award_level: "YES", world_record: "YES", olympic_gold: "NO", height_category: "Average", play_style: "Finisher / Wicket-keeper" } },
    { name: "Virat Kohli", aliases: ["Kohli", "King Kohli", "Cheeku"], attrs: { gender: "YES", region: "YES", sport: "Cricket", active_status: "YES", award_level: "YES", world_record: "YES", olympic_gold: "NO", height_category: "Average", play_style: "Aggressive Batsman" } },
    { name: "Sachin Tendulkar", aliases: ["Sachin", "Master Blaster", "God of Cricket"], attrs: { gender: "YES", region: "YES", sport: "Cricket", active_status: "NO", award_level: "YES", world_record: "YES", olympic_gold: "NO", height_category: "Short", play_style: "Technical Batsman" } },
    { name: "Lionel Messi", aliases: ["Messi", "Leo", "La Pulga"], attrs: { gender: "YES", region: "NO", sport: "Football", active_status: "YES", award_level: "YES", world_record: "YES", olympic_gold: "YES", height_category: "Short", play_style: "Playmaker / Dribbler" } },
    { name: "Cristiano Ronaldo", aliases: ["Ronaldo", "CR7", "The Goat"], attrs: { gender: "YES", region: "NO", sport: "Football", active_status: "YES", award_level: "YES", world_record: "YES", olympic_gold: "NO", height_category: "Tall", play_style: "Power Forward" } },
    { name: "Roger Federer", aliases: ["Federer", "RF", "King of Grass"], attrs: { gender: "YES", region: "NO", sport: "Tennis", active_status: "NO", award_level: "YES", world_record: "YES", olympic_gold: "YES", height_category: "Tall", play_style: "Elegant All-court" } },
    { name: "Serena Williams", aliases: ["Serena", "Queen of the Court"], attrs: { gender: "NO", region: "NO", sport: "Tennis", active_status: "NO", award_level: "YES", world_record: "YES", olympic_gold: "YES", height_category: "Average", play_style: "Power Hitter" } },
    { name: "PV Sindhu", aliases: ["Sindhu"], attrs: { gender: "NO", region: "YES", sport: "Badminton", active_status: "YES", award_level: "YES", world_record: "NO", olympic_gold: "NO", height_category: "Tall", play_style: "Attacking Smashing" } },
    { name: "Tiger Woods", aliases: ["Tiger"], attrs: { gender: "YES", region: "NO", sport: "Golf", active_status: "YES", award_level: "YES", world_record: "YES", olympic_gold: "NO", height_category: "Tall", play_style: "Precision Putter" } },
    { name: "Usain Bolt", aliases: ["Bolt", "Lightning Bolt"], attrs: { gender: "YES", region: "NO", sport: "Athletics", active_status: "NO", award_level: "YES", world_record: "YES", olympic_gold: "YES", height_category: "Tall", play_style: "Sprinter" } },
    { name: "Novak Djokovic", aliases: ["Djokovic", "Nole", "The Joker"], attrs: { gender: "YES", region: "NO", sport: "Tennis", active_status: "YES", award_level: "YES", world_record: "YES", olympic_gold: "YES", height_category: "Tall", play_style: "Defensive Mastermind" } },
    { name: "Sunil Chhetri", aliases: ["Chhetri", "Captain Fantastic"], attrs: { gender: "YES", region: "YES", sport: "Football", active_status: "YES", award_level: "YES", world_record: "NO", olympic_gold: "NO", height_category: "Short", play_style: "Clinical Striker" } },
    { name: "Rafael Nadal", aliases: ["Nadal", "Rafa", "King of Clay"], attrs: { gender: "YES", region: "NO", sport: "Tennis", active_status: "YES", award_level: "YES", world_record: "YES", olympic_gold: "YES", height_category: "Tall", play_style: "High-intensity Topspin" } },
    { name: "Neeraj Chopra", aliases: ["Neeraj"], attrs: { gender: "YES", region: "YES", sport: "Athletics", active_status: "YES", award_level: "YES", world_record: "NO", olympic_gold: "YES", height_category: "Tall", play_style: "Javelin Thrower" } },
    { name: "Abhinav Bindra", aliases: ["Bindra"], attrs: { gender: "YES", region: "YES", sport: "Shooting", active_status: "NO", award_level: "YES", world_record: "YES", olympic_gold: "YES", height_category: "Average", play_style: "Precision Marksman" } },
  ];

  await seedTheme("sports", "Sports", sportsConfigs, sportsPeople);

  // --- MOVIES THEME ---
  const movieConfigs = [
    { key: "gender", type: "YESNO", strength: 1, groupId: "core" },
    { key: "region", type: "YESNO", strength: 2, groupId: "core" },
    { key: "profession", type: "VALUE", strength: 3, groupId: "career" },
    { key: "oscar_winner", type: "YESNO", strength: 3, groupId: "achievement" },
    { key: "hollywood", type: "YESNO", strength: 2, groupId: "region" },
    { key: "bollywood", type: "YESNO", strength: 2, groupId: "region" },
    { key: "superhero_role", type: "YESNO", strength: 4, groupId: "roles" },
    { key: "action_star", type: "YESNO", strength: 4, groupId: "roles" },
  ];

  const moviePeople = [
    { name: "Shah Rukh Khan", aliases: ["SRK", "King Khan", "Badshah"], attrs: { gender: "YES", region: "YES", profession: "Actor", oscar_winner: "NO", hollywood: "NO", bollywood: "YES", superhero_role: "YES", action_star: "YES" } },
    { name: "Tom Cruise", aliases: ["Ethan Hunt"], attrs: { gender: "YES", region: "NO", profession: "Actor", oscar_winner: "NO", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "YES" } },
    { name: "Amitabh Bachchan", aliases: ["Big B", "Shenshah"], attrs: { gender: "YES", region: "YES", profession: "Actor", oscar_winner: "NO", hollywood: "NO", bollywood: "YES", superhero_role: "NO", action_star: "YES" } },
    { name: "Leonardo DiCaprio", aliases: ["Leo"], attrs: { gender: "YES", region: "NO", profession: "Actor", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "NO" } },
    { name: "Robert Downey Jr.", aliases: ["RDJ", "Iron Man", "Tony Stark"], attrs: { gender: "YES", region: "NO", profession: "Actor", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "YES", action_star: "YES" } },
    { name: "Scarlett Johansson", aliases: ["Black Widow"], attrs: { gender: "NO", region: "NO", profession: "Actor", oscar_winner: "NO", hollywood: "YES", bollywood: "NO", superhero_role: "YES", action_star: "YES" } },
    { name: "Deepika Padukone", aliases: ["Deepu"], attrs: { gender: "NO", region: "YES", profession: "Actor", oscar_winner: "NO", hollywood: "YES", bollywood: "YES", superhero_role: "NO", action_star: "YES" } },
    { name: "Meryl Streep", aliases: [], attrs: { gender: "NO", region: "NO", profession: "Actor", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "NO" } },
    { name: "Christopher Nolan", aliases: [], attrs: { gender: "YES", region: "NO", profession: "Director", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "NO" } },
    { name: "Steven Spielberg", aliases: [], attrs: { gender: "YES", region: "NO", profession: "Director", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "NO" } },
    { name: "Priyanka Chopra", aliases: ["PC", "Piggy Chops"], attrs: { gender: "NO", region: "YES", profession: "Actor", oscar_winner: "NO", hollywood: "YES", bollywood: "YES", superhero_role: "NO", action_star: "NO" } },
    { name: "Rajinikanth", aliases: ["Thalaiva", "Superstar"], attrs: { gender: "YES", region: "YES", profession: "Actor", oscar_winner: "NO", hollywood: "NO", bollywood: "YES", superhero_role: "NO", action_star: "YES" } },
    { name: "Jackie Chan", aliases: [], attrs: { gender: "YES", region: "YES", profession: "Actor", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "YES" } },
    { name: "Brad Pitt", aliases: [], attrs: { gender: "YES", region: "NO", profession: "Actor", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "NO" } },
    { name: "Angelina Jolie", aliases: [], attrs: { gender: "NO", region: "NO", profession: "Actor", oscar_winner: "YES", hollywood: "YES", bollywood: "NO", superhero_role: "NO", action_star: "YES" } },
  ];

  await seedTheme("movies", "Movies", movieConfigs, moviePeople);

  // --- HISTORY THEME ---
  const historyConfigs = [
    { key: "gender", type: "YESNO", strength: 1, groupId: "core" },
    { key: "region", type: "YESNO", strength: 2, groupId: "core" },
    { key: "vocation", type: "VALUE", strength: 3, groupId: "career" },
    { key: "century", type: "VALUE", strength: 2, groupId: "time" },
    { key: "political_leader", type: "YESNO", strength: 3, groupId: "career" },
    { key: "scientist", type: "YESNO", strength: 4, groupId: "career" },
    { key: "nobel_prize", type: "YESNO", strength: 4, groupId: "achievement" },
    { key: "royalty", type: "YESNO", strength: 5, groupId: "status" },
  ];

  const historyPeople = [
    { name: "Mahatma Gandhi", aliases: ["Bapu", "Father of the Nation"], attrs: { gender: "YES", region: "YES", vocation: "Freedom Fighter", century: "20th", political_leader: "YES", scientist: "NO", nobel_prize: "NO", royalty: "NO" } },
    { name: "Albert Einstein", aliases: [], attrs: { gender: "YES", region: "NO", vocation: "Physicist", century: "20th", political_leader: "NO", scientist: "YES", nobel_prize: "YES", royalty: "NO" } },
    { name: "Nelson Mandela", aliases: ["Madiba"], attrs: { gender: "YES", region: "NO", vocation: "Revolutionary", century: "20th", political_leader: "YES", scientist: "NO", nobel_prize: "YES", royalty: "NO" } },
    { name: "Abraham Lincoln", aliases: ["Abe"], attrs: { gender: "YES", region: "NO", vocation: "President", century: "19th", political_leader: "YES", scientist: "NO", nobel_prize: "NO", royalty: "NO" } },
    { name: "Marie Curie", aliases: [], attrs: { gender: "NO", region: "NO", vocation: "Chemist", century: "20th", political_leader: "NO", scientist: "YES", nobel_prize: "YES", royalty: "NO" } },
    { name: "Leonardo da Vinci", aliases: [], attrs: { gender: "YES", region: "NO", vocation: "Polymath", century: "15th", political_leader: "NO", scientist: "YES", nobel_prize: "NO", royalty: "NO" } },
    { name: "Ashoka the Great", aliases: ["Samrat Ashoka"], attrs: { gender: "YES", region: "YES", vocation: "Emperor", century: "3rd BC", political_leader: "YES", scientist: "NO", nobel_prize: "NO", royalty: "YES" } },
    { name: "Napoleon Bonaparte", aliases: ["Napoleon"], attrs: { gender: "YES", region: "NO", vocation: "Emperor", century: "19th", political_leader: "YES", scientist: "NO", nobel_prize: "NO", royalty: "YES" } },
    { name: "Martin Luther King Jr.", aliases: ["MLK"], attrs: { gender: "YES", region: "NO", vocation: "Activist", century: "20th", political_leader: "YES", scientist: "NO", nobel_prize: "YES", royalty: "NO" } },
    { name: "Mother Teresa", aliases: ["Saint Teresa"], attrs: { gender: "NO", region: "NO", vocation: "Nun", century: "20th", political_leader: "NO", scientist: "NO", nobel_prize: "YES", royalty: "NO" } },
    { name: "Isaac Newton", aliases: [], attrs: { gender: "YES", region: "NO", vocation: "Mathematician", century: "17th", political_leader: "NO", scientist: "YES", nobel_prize: "NO", royalty: "NO" } },
    { name: "APJ Abdul Kalam", aliases: ["Missile Man"], attrs: { gender: "YES", region: "YES", vocation: "Scientist", century: "21st", political_leader: "YES", scientist: "YES", nobel_prize: "NO", royalty: "NO" } },
    { name: "Julius Caesar", aliases: [], attrs: { gender: "YES", region: "NO", vocation: "General", century: "1st BC", political_leader: "YES", scientist: "NO", nobel_prize: "NO", royalty: "YES" } },
    { name: "Queen Elizabeth II", aliases: [], attrs: { gender: "NO", region: "NO", vocation: "Queen", century: "21st", political_leader: "YES", scientist: "NO", nobel_prize: "NO", royalty: "YES" } },
    { name: "Subhas Chandra Bose", aliases: ["Netaji"], attrs: { gender: "YES", region: "YES", vocation: "Revolutionary", century: "20th", political_leader: "YES", scientist: "NO", nobel_prize: "NO", royalty: "NO" } },
  ];

  await seedTheme("history", "History", historyConfigs, historyPeople);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => { // NOSONAR
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });

