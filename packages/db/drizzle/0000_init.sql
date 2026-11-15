CREATE TABLE "api_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"body" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battles" (
	"player_tag" text NOT NULL,
	"battle_time" timestamp with time zone NOT NULL,
	"mode" text,
	"map" text,
	"brawler" text,
	"result" text,
	"trophy_change" integer,
	"raw" jsonb NOT NULL,
	CONSTRAINT "battles_player_tag_battle_time_pk" PRIMARY KEY("player_tag","battle_time")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"tag" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trophies" integer NOT NULL,
	"tracked" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_player_tag_players_tag_fk" FOREIGN KEY ("player_tag") REFERENCES "public"."players"("tag") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battles_player_time_idx" ON "battles" USING btree ("player_tag","battle_time" desc);