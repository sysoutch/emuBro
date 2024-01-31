package ch.sysout.util;

public class Monitor {

    private String name;
    private boolean active;
    private boolean primary;

    public Monitor(String name, boolean active, boolean primary) {
        this.name = name;
        this.active = active;
        this.primary = primary;
    }

    public String getName() {
        return name;
    }

    public boolean isActive() {
        return active;
    }

    public boolean isPrimary() {
        return primary;
    }
}
