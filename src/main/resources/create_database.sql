create table if not exists explorer (
	explorer_id int identity,
	explorer_configWizardHiddenAtStartup boolean,
	explorer_searchProcessComplete boolean,
	explorer_lastSelectedGameId int
)

create table if not exists emulator (
	emulator_id int identity,
	emulator_name varchar(255),
	emulator_path varchar(255),
	emulator_iconFilename varchar(255),
	emulator_configFilePath varchar(255),
	emulator_website varchar(255),
	emulator_startParameters varchar(255),
	emulator_searchString varchar(255),
	emulator_supportedFileTypes varchar(255),
	emulator_autoSearchEnabled boolean
)

create table if not exists platform (
	platform_id int identity,
	platform_name varchar(255) unique,
	platform_iconFilename varchar(255),
	platform_defaultGameCover varchar(255),
	platform_gameSearchModes varchar(255),
	platform_searchFor varchar(255),
	platform_fileStructure int,
	platform_supportedArchiveTypes varchar(255),
	platform_supportedImageTypes varchar(255),
	platform_defaultEmulatorId int,
	platform_autoSearchEnabled boolean
)

create table if not exists fileStructure (
	structure_id int identity,
	structure_folderName varchar(255),
	structure_files varchar(255)
)

create table if not exists game (
	game_id int identity,
	game_name varchar(255),
	game_path varchar(255) unique,
	game_iconPath varchar(255),
	game_coverPath varchar(255),
	game_rate int,
	game_added timestamp,
	game_lastPlayed timestamp,
	game_playCount int,
	game_emulatorId int,
	game_platformId int,
	game_platformIconFileName varchar(255)
)

create table if not exists platform_structure (
	platform_id int references platform(platform_id),
	structure_id int references fileStructure(structure_id)
)

create table if not exists platform_emulator (
	platform_id int references platform(platform_id),
	emulator_id int references emulator(emulator_id)
)

create table if not exists extension (
	extension_id int identity,
	extension_extension varchar(16)	
)