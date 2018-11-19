create table if not exists emubro (
	emubro_dbVersion varchar(255) unique
)

create table if not exists explorer (
	explorer_id int identity,
	explorer_configWizardHiddenAtStartup boolean,
	explorer_showGreetingNotification boolean,
	explorer_showBrowseComputerNotification boolean,
	explorer_searchProcessComplete boolean,
	explorer_searchProcessComplete2 boolean,
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
	emulator_setupFileMatch varchar(255),
	emulator_supportedFileTypes varchar(255),
	emulator_autoSearchEnabled boolean,
	emulator_deleted boolean
)

create table if not exists platform (
	platform_id int identity,
	platform_name varchar(255) unique,
	platform_shortName varchar(255),
	platform_iconFilename varchar(255),
	platform_defaultGameCover varchar(255),
	platform_gameSearchModes varchar(255),
	platform_searchFor varchar(255),
	platform_fileStructure int,
	platform_supportedArchiveTypes varchar(255),
	platform_supportedImageTypes varchar(255),
	platform_defaultEmulatorId int,
	platform_autoSearchEnabled boolean,
	platform_deleted boolean
)

create table if not exists tag (
	tag_id int identity,
	tag_name varchar(255) unique,
	tag_hexColor varchar(7)
)

create table if not exists file (
	file_id int identity,
	file_path varchar(255) unique
)

create table if not exists checksum (
	checksum_id int identity,
	checksum_checksum char(32) unique
)

create table if not exists fileStructure (
	structure_id int identity,
	structure_folderName varchar(255),
	structure_files varchar(255)
)

create table if not exists game (
	game_id int identity,
	game_name varchar(255),
	game_gameCode varchar(255),
	game_defaultFileId int,
	game_checksumId int,
	game_iconPath varchar(255),
	game_coverPath varchar(255),
	game_rate int,
	game_added datetime,
	game_lastPlayed datetime,
	game_playCount int,
	game_defaultEmulatorId int,
	game_platformId int,
	game_platformIconFileName varchar(255),
	game_deleted boolean
)

create table if not exists platform_structure (
	platform_id int references platform(platform_id),
	structure_id int references fileStructure(structure_id)
)

create table if not exists platform_emulator (
	platform_id int references platform(platform_id),
	emulator_id int references emulator(emulator_id)
)

create table if not exists game_file (
	game_id int references game(game_id),
	file_id int references file(file_id)
)

create table if not exists game_tag (
	game_id int references game(game_id),
	tag_id int references tag(tag_id)
)

create table if not exists extension (
	extension_id int identity,
	extension_extension varchar(16)	
)