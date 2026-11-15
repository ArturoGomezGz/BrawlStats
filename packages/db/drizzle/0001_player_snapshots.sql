CREATE TABLE "player_snapshots" (
	"player_tag" text NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trophies" integer NOT NULL,
	CONSTRAINT "player_snapshots_player_tag_taken_at_pk" PRIMARY KEY("player_tag","taken_at")
);
--> statement-breakpoint
ALTER TABLE "player_snapshots" ADD CONSTRAINT "player_snapshots_player_tag_players_tag_fk" FOREIGN KEY ("player_tag") REFERENCES "public"."players"("tag") ON DELETE cascade ON UPDATE no action;