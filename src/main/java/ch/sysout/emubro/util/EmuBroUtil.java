package ch.sysout.emubro.util;

import ch.sysout.emubro.api.model.Emulator;
import ch.sysout.ui.util.UIUtil;

import javax.swing.filechooser.FileSystemView;
import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;

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
}
