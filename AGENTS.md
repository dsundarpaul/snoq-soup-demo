## 1. Build, Test, and Lint Commands

### Root-level (Turbo Monorepo)
```bash
# Build all packages/apps
pnpm build

# Development mode (watch)
pnpm dev

# Run all tests across workspace
pnpm test

# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Clean build artifacts
pnpm clean
```

### API App (apps/api) - Specific Commands
```bash
cd apps/api

# Build
pnpm build

# Development with watch
pnpm dev

# Run all tests
pnpm test

# Run single test file (CRITICAL for focused testing)
pnpm jest src/modules/drops/drops.service.spec.ts
pnpm jest --testNamePattern="should create drop"

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov

# Debug tests
pnpm test:debug

# E2E tests
pnpm test:e2e

# Lint with auto-fix
pnpm lint

# Format with Prettier
pnpm format

# Type check only
pnpm typecheck
```

### Shared Package (packages/shared)
```bash
cd packages/shared

# Build
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck
```

---

## 2. Code Style Guidelines

### TypeScript & Formatting
- **Quotes**: Double quotes for strings, imports, and all TypeScript files
- **Semicolons**: Required at end of statements
- **Indentation**: 2 spaces
- **Line width**: Prettier default (80 chars)
- **Trailing commas**: ES5 compatible trailing commas
- **Strict mode**: All strict TypeScript flags enabled

### Imports & Module Path Aliases
```typescript
// External packages first
import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";

// Internal absolute imports (via tsconfig paths)
import { DatabaseService } from "@/database/database.service";
import { Drop } from "@/database/schemas/drop.schema";

// Workspace imports
import { SharedTypes } from "@souqsnap/shared";

// Relative imports (within same module only)
import { CreateDropDto } from "./dto/request/create-drop.dto";
```

**Path Mapping (tsconfig.json)**:
- `@/*` → `src/*`
- `@souqsnap/shared` → `packages/shared/src`

### Naming Conventions
- **Classes**: PascalCase (e.g., `DropsService`, `CreateDropDto`)
- **Interfaces**: PascalCase with no I-prefix (e.g., `DropResponse`)
- **Enums**: PascalCase for name, UPPER_SNAKE_CASE for values (e.g., `RedemptionType.ANYTIME`)
- **Type aliases**: PascalCase (e.g., `DropDocument`)
- **Variables/functions**: camelCase (e.g., `findById`, `createdAt`)
- **Constants**: camelCase for local, UPPER_SNAKE_CASE for true constants
- **Files**: kebab-case.ts (e.g., `drops.controller.ts`, `create-drop.dto.ts`)
- **DTOs**: Suffix with Dto (e.g., `CreateDropDto`, `DropResponseDto`)
- **Schemas**: Suffix with Schema only for the schema constant (e.g., `DropSchema`)

### Types & Strictness
- Use `!` (definite assignment) for Mongoose document properties
- Use `?` for optional DTO fields and optional properties
- Prefer union types over enums where possible
- Always type function return values on public APIs
- Use `readonly` for injected dependencies and immutable arrays
- Use `void` for functions that don't return a value
- Use `unknown` over `any` when type is truly unknown

### Error Handling Patterns
```typescript
// Use NestJS built-in exceptions
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";

// Throw with descriptive messages
if (!drop) {
  throw new NotFoundException("Drop not found");
}

// Service layer throws, controllers don't catch
// Global HttpExceptionFilter handles formatting
```

### Async Patterns
```typescript
// Use async/await, never callbacks
async findById(id: string): Promise<Drop> {
  const drop = await this.dropModel.findById(id).lean();
  if (!drop) {
    throw new NotFoundException("Drop not found");
  }
  return drop;
}

// Parallel execution with Promise.all
const [drops, total] = await Promise.all([
  this.dropModel.find().lean(),
  this.dropModel.countDocuments(),
]);
```

---

## 3. NestJS + Mongoose Architecture

### Project Structure
```
apps/api/src/
├── database/
│   ├── database.module.ts      # Global module
│   ├── database.service.ts     # Exposes all models
│   └── schemas/
│       └── *.schema.ts         # Mongoose schemas
├── modules/
│   └── {feature}/
│       ├── {feature}.module.ts
│       ├── {feature}.controller.ts
│       ├── {feature}.service.ts
│       └── dto/
│           ├── request/
│           └── response/
├── common/
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── enums/
├── config/
└── infrastructure/
```

### DatabaseService Pattern (REQUIRED)
All database access goes through `DatabaseService`. Never inject individual models.

```typescript
// CORRECT - Using DatabaseService
@Injectable()
export class DropsService {
  constructor(private readonly database: DatabaseService) {}

  async findAll() {
    return this.database.drops.find().lean();
  }
}

// WRONG - Direct model injection
@Injectable()
export class DropsService {
  constructor(@InjectModel(Drop.name) private dropModel: Model<Drop>) {}
}
```

### Schema Requirements
Every schema file must:
1. Export the class with `@Schema()` decorator
2. Export `SchemaFactory.createForClass()` result
3. Use triple decorators: `@Prop()`, `@ApiProperty()`, and class-validator decorators
4. Define proper TypeScript types with `!` for required fields

```typescript
@Schema({ timestamps: true })
export class Drop extends Document {
  @ApiProperty({ type: String })
  @IsString()
  @Prop({ type: String, required: true })
  name!: string;
}

export const DropSchema = SchemaFactory.createForClass(Drop);
DropSchema.index({ field: 1 });
```

### DTO Rules
- **Request DTOs**: Plain classes with validation decorators
- **Response DTOs**: Use interfaces or classes with `@ApiProperty()`
- Never duplicate schema fields — extend or compose
- Use `PartialType`, `OmitType`, `PickType` from `@nestjs/swagger` for variations

### Swagger Documentation
```typescript
@ApiTags("Drops")
@Controller()
export class DropsController {
  @Get("drops")
  @ApiOperation({ summary: "Get all drops" })
  @ApiResponse({ status: 200, type: [DropResponseDto] })
  @ApiBearerAuth()
  async findAll(): Promise<DropResponseDto[]> {
    return this.dropsService.findAll();
  }
}
```

### Query Patterns
```typescript
// Use options object, never chain
const drops = await this.database.drops.find(
  { merchantId, deletedAt: null },
  null,
  { limit: 20, sort: { createdAt: -1 } }
).lean();

// Always use lean() for read-only queries
// Never use .exec() - not needed with async/await
```

### Response Rules
- Return raw objects: `return drop;`
- No wrapping — the global filter handles error formatting
- Success responses are unwrapped objects
- Error responses follow the `HttpExceptionFilter` format

---

## 4. Task Execution Principles

### Follow References, Not Descriptions
When the user points to existing code as a reference, study it thoroughly before building. Match its patterns exactly. Working code is a better spec than English descriptions.

### Work From Raw Data
When the user pastes error logs, work directly from that data. Don't guess — trace the actual error. Ask for console output if missing: "paste the console output - raw data finds the real problem faster."

### One-Word Mode
When the user says "yes," "do it," or "push" — execute immediately without repeating the plan.

### Autonomous Bug Fixing
When given a bug report: just fix it. Trace logs, errors, failing tests — then resolve them. Zero context switching required from the user.

### Edit Safety
- Re-read files before AND after editing
- Never batch more than 3 edits to the same file without verification
- Use grep for: direct calls, type references, string literals, dynamic imports, re-exports
- Never delete a file without verifying nothing else references it

---

## 5. Dependencies & Tooling

### Package Manager
- **pnpm only** — never npm or yarn
- Install: `pnpm add <package>` (no version to get latest stable)
- Only pin versions for specific reasons (known bugs, compatibility)

### Scaffolding
Use official CLI commands to initialize:
```bash
pnpm dlx create-nest-app@latest
pnpm dlx create-turbo@latest
```
Never manually write `package.json` or scaffolding files.

### Testing Requirements
- **Unit tests**: Co-located as `*.spec.ts` next to source files
- **E2E tests**: In `test/e2e/*.spec.ts`
- Use `mongodb-memory-server` for test database
- Use `@faker-js/faker` for test data
- Always clean up test data in `afterEach` / `afterAll`

### Pre-Commit Checklist
Before finishing any task:
```bash
pnpm lint        # or cd apps/api && pnpm lint
pnpm typecheck   # or cd apps/api && pnpm typecheck
pnpm test -- --testPathPattern="your-changed-file"  # run relevant tests
```
