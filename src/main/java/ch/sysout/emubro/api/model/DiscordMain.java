package ch.sysout.emubro.api.model;

import java.util.Scanner;

import net.arikia.dev.drpc.DiscordEventHandlers;
import net.arikia.dev.drpc.DiscordRPC;
import net.arikia.dev.drpc.DiscordRichPresence;

public class DiscordMain {

	private static boolean ready = false;
	private static final String clientId = "560036334744371200";
	private static String currentGame = "Donkey Kong Country";
	private static String botName = "emuBro";
	private static long timeStarted = System.currentTimeMillis();

	public static void doIt() throws Exception {
		Runtime.getRuntime().addShutdownHook(new Thread(() -> {
			System.out.println("Closing Discord hook.");
			DiscordRPC.discordShutdown();
		}));

		initDiscord();

		System.out.println("Running callbacks...");
		while (true) {
			DiscordRPC.discordRunCallbacks();

			if (!ready) {
				continue;
			}
			System.out.print("> ");
			Scanner in = new Scanner(System.in);
			String input = in.nextLine();

			if (!input.equalsIgnoreCase("shutdown")) {
				if (input.equalsIgnoreCase(botName)) {
					startUp();
				} else {
					System.out.println("Unknown Command: " + "\n\nAvailable Commands:"
							+ "\n"+botName+" - Test.\nshutdown - End this test peacefully.");
				}
			} else {
				System.exit(0);
			}
		}
	}

	private static void initDiscord() {
		DiscordEventHandlers handlers = new DiscordEventHandlers.Builder().setReadyEventHandler((user) -> {
			DiscordMain.ready = true;
			System.out.println("Welcome " + user.username + "#" + user.discriminator + ".");
			startUp();
		}).build();
		DiscordRPC.discordInitialize(clientId, handlers, false);
		DiscordRPC.discordRegister(clientId, "");
	}

	private static void startUp() {
		DiscordRichPresence.Builder presence = new DiscordRichPresence.Builder("");
		presence.setDetails(currentGame);
		presence.setStartTimestamps(timeStarted);
		DiscordRPC.discordUpdatePresence(presence.build());
	}
}