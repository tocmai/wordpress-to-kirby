# wordpress-to-kirby

A Node.js-based command-line utility to convert a WordPress XML export to a directory of Kirby CMS files.

## Getting started

Install [`wordpress-to-kirby`](https://npmjs.com/package/wordpress-to-kirby/) from npm:

```bash
npm install wordpress-to-kirby
```

Or run it with `npx` without installing:

```bash
npx wordpress-to-kirby
```

Use `wordpress-to-kirby --help` for information on usage and available commands and options.

## Commands

### `wordpress-to-kirby generate`

Generate a Kirby CMS file structure from the provided XML file. Usage:

```bash
wordpress-to-kirby generate [options] <wordpress-xml-file>
```

### `wordpress-to-kirby download`

Download the attachments found in the provided XML file. Usage: 

```bash
wordpress-to-kirby download [options] <wordpress-xml-file>
```

## Options

### General options

#### `-h, --help`

Prints out this help information.

#### `-v, --version`

Shows the program version.

#### `-o, --outdir`

Root directory to which to write the output, relative to the current working directory. Default: `wordpress-to-kirby`.

#### `--contentdir`

For the `download` command, point to the location of a `wp-content` directory from which to download attachments. 
		
The path can be:
		
* an absolute or relative local path;
* a fully-qualified URL, including the `wp-content` segment, e.g. `https://mywebsite.local/wp-content/`

#### `--parse=<rules>`
		
Instructions to parse some fields, specified as `<key>=<parser>,<key>=<parser>,…`.
		
Supported parsers:

* `php`: deserialize PHP object;
* `yaml`: parse as YAML;
* `json`: parse as JSON;
* `html`: parse as HTML.

#### `--serialize=<rules>`
		
Instructions to serialize some fields, specified as `<key>=<serializer>,<key>=<serializer>,…`.

Supported serializers:

* `php`: serialize as PHP object;
* `yaml`: serialize as YAML;
* `json`: serialize as JSON;
* `html`: serialize as HTML.

### `--exclude-fields=<fields>`

Exclude certain fields from the output, specified as a comma-separated list of fields.

### `--include-fields=<fields>`

Only include certain fields from the output, specified as a comma-separated list of fields. When `--include-fields` is specified, the `--exclude-fields` option is ignored.

### `--exclude-types=<types>`

Exclude certain post types from the output, specified as a comma-separated list of post types.

### `--include-types=<types>`
	
Only include certain post types from the output, specified as a comma-separated list of post types.

When `--include-types` is specified, the `--exclude-types` option is ignored.

## Keys extracted from the XML

The following keys are extracted from the top level of the WordPress XML export:

`title`, `link`, `pubDate`, `creator`, `guid`, `guid_isPermaLink`, `description`, `content`, `excerpt`, `post_id`, `post_date`, `post_date_gmt`, `post_modified`, `post_modified_gmt`, `comment_status`, `ping_status`,  `post_name`, `status`, `post_parent`, `menu_order`, `post_type`, `post_password`, `is_sticky`, `attachment_url` (only populated for the `attachment` post type).

Fields from `<wp:postmeta>` are included in the output with the `postmeta*` prefix.

## Keys generated from scratch

* `uuid: <string>`, containing 16 random alphanumeric characters.
* `template: 'attachment'` is added to attachments.

## Prior art

* [`splorp/wordpress-xml-to-kirby`](https://github.com/splorp/wordpress-xml-to-kirby)