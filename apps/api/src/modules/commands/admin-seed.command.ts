import { Command, CommandRunner, Option } from "nest-commander";
import { DatabaseService } from "../../database/database.service";
import * as bcrypt from "bcryptjs";

interface AdminSeedOptions {
  password: string;
  name: string;
}

@Command({
  name: "admin:seed",
  description: "Create initial admin user",
  arguments: "<email>",
})
export class AdminSeedCommand extends CommandRunner {
  constructor(private database: DatabaseService) {
    super();
  }

  @Option({
    flags: "-p, --password <password>",
    description: "Admin password",
    required: true,
  })
  parsePassword(val: string): string {
    return val;
  }

  @Option({
    flags: "-n, --name <name>",
    description: "Admin name",
    defaultValue: "Platform Admin",
  })
  parseName(val: string): string {
    return val;
  }

  async run(inputs: string[], options: AdminSeedOptions): Promise<void> {
    const [email] = inputs;

    if (!email) {
      console.error("Error: Email is required");
      process.exit(1);
    }

    // Check if any admin exists
    const existingAdmin = await this.database.admins
      .findOne({ deletedAt: null })
      .lean();
    if (existingAdmin) {
      console.error("Error: Admin already exists. Cannot create another.");
      process.exit(1);
    }

    // Check if email already registered
    const existingEmail = await this.database.admins
      .findOne({ email: email.toLowerCase() })
      .lean();
    if (existingEmail) {
      console.error("Error: Email already registered");
      process.exit(1);
    }

    // Create admin
    const hashedPassword = await bcrypt.hash(options.password, 12);
    const admin = await this.database.admins.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: options.name,
    });

    console.log(`Admin created successfully: ${admin.email}`);
    process.exit(0);
  }
}
