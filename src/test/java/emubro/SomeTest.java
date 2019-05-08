package emubro;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;

import org.junit.jupiter.api.Test;

import ch.sysout.emubro.util.MessageConstants;

class SomeTest {

	MessageConstants mc = new MessageConstants();

	@Test
	void test() {
		assertTrue(new File("src/main/resources/update_database_0.1.0.sql").exists(), "database update file update_database_0.1.0.sql exists?");
	}
}
