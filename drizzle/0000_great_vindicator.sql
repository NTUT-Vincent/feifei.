CREATE TABLE "connected_accounts" (
	"session_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"token_expires_at" timestamp with time zone NOT NULL,
	"scopes" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connected_accounts_session_id_provider_pk" PRIMARY KEY("session_id","provider")
);
--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id_hash" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_verifier" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_budgets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_session_id_guest_sessions_id_hash_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id_hash") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_session_id_guest_sessions_id_hash_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guest_sessions"("id_hash") ON DELETE cascade ON UPDATE no action;