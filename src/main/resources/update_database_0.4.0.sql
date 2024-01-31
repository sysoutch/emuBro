ALTER TABLE emulator ADD COLUMN emulator_biosRequired boolean default false;
ALTER TABLE emulator ADD COLUMN emulator_runCommandsBefore varchar(255) default '';
ALTER TABLE platform ADD COLUMN platform_companyName VARCHAR(255) default '';