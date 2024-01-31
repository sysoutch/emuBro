package ch.sysout.emubro.util;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.ui.util.UIUtil;

import javax.swing.filechooser.FileSystemView;
import java.awt.*;
import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.*;

public class EmuBroUtil {
    public static String getResourceDirectory() {
        return FileSystemView.getFileSystemView().getDefaultDirectory().getPath() + File.separator + "emuBro";
    }

    public static void runEmulator(Emulator emulator, Component parentComponent) {
        ProcessBuilder pb = new ProcessBuilder(emulator.getAbsolutePath());
        pb.directory(new File(emulator.getPath()));
        try {
            Process process = pb.start();
        } catch (IOException e1) {
            UIUtil.showErrorMessage(parentComponent, "couldn't run emulator.\n\n"
                    + e1.getMessage(), "error starting emulator");
        }
    }

    public static float round(float d, int decimalPlace) {
        BigDecimal bd = new BigDecimal(Float.toString(d));
        bd = bd.setScale(decimalPlace, RoundingMode.HALF_UP);
        return bd.floatValue();
    }

    /**
     * Export a resource embedded into a Jar file to the local file path.
     *
     * @param resourceName ie.: "/SmartLibrary.dll"
     * @throws Exception
     */
    public static void exportResource(String resourceName, Path target) throws Exception {
        try (InputStream stream = EmuBroUtil.class.getResourceAsStream(resourceName)) {
            if (stream == null) {
                throw new Exception("Cannot get resource \"" + resourceName + "\" from Jar file.");
            }
            Files.copy(stream, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public static URI getFileFromInternalResources(String path) throws URISyntaxException {
        return EmuBroUtil.class.getResource(path).toURI();
    }

    public static BufferedReader getBufferredReaderFromInternalResourceFile(String s) {
        return new BufferedReader(new InputStreamReader(EmuBroUtil.class.getResourceAsStream(s)));
    }
}
