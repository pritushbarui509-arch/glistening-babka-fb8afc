CREATE TABLE "access_attempts" (
	"id" text PRIMARY KEY,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_keys" (
	"id" text PRIMARY KEY,
	"key_hash" text NOT NULL,
	"version" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_sessions" (
	"token_hash" text PRIMARY KEY,
	"key_version" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
