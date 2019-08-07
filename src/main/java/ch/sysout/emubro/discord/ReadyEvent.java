package ch.sysout.emubro.discord;

import net.arikia.dev.drpc.DiscordUser;
import net.arikia.dev.drpc.callbacks.ReadyCallback;

public class ReadyEvent implements ReadyCallback {

	@Override
	public void apply(DiscordUser user) {
		System.out.println("Discord's ready!");
		System.out.println("Welcome " + user.username + "#" + user.discriminator + "!");
	}
}
