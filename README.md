# wordpress-to-kirby

<img src="./.github/wordpress-to-kirby.svg" height='60'>

<a href="https://www.npmjs.org/package/wordpress-to-kirby"><img src="https://img.shields.io/npm/v/wordpress-to-kirby.svg?style=flat-square&labelColor=EEEEEE&color=black" alt="npm version"></a>

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

Generate a Kirby CMS file structure from the input file. Usage:

```bash
wordpress-to-kirby generate [options] <input-file>
```

The input must correspond to a WordPress export XML file. When `-` is provided, the content is read from STDIN.

### `wordpress-to-kirby download`

Download the attachments found in the input file. Usage: 

```bash
wordpress-to-kirby download [options] <input-file>
```

The input must correspond to either a WordPress export XML file or a metadata JSON file (generated with the `generate` command). When `-` is provided, the content is read from STDIN.

## Options

### `-h, --help`

Prints out this help information.

```bash
wordpress-to-kirby --help
```

### `-v, --version`

Shows the program version.

```bash
wordpress-to-kirby --version
```

### `-o, --outdir=<path>`

Root directory to which to write the output, relative to the current working directory. Default: `wordpress-to-kirby`.

```bash
wordpress-to-kirby generate my-blog.xml -o my-blog 
```

When using the `--only-metadata` option is provided, the `--outdir` value can be `-`, which will cause the `metadata.json` file to be output to STDOUT.

### `--contentdir=<path>`

For the `download` command, point to the location of a `wp-content` directory from which to download attachments. 
		
The path can be:
		
* an absolute or relative local path;
* a fully-qualified URL, including the `wp-content` segment, e.g. `https://mywebsite.local/wp-content/`

```bash
wordpress-to-kirby download my-blog.xml -o my-blog --contentdir=path/to/downloaded-wp-content
```

### `--parse=<rules>`
		
Instructions to parse some fields, specified as `<key>=<parser>,<key>=<parser>,…`.

The `--parse` option can be used multiple times.
		
Supported parsers:

* `php`: deserialize PHP object;
* `yaml`: parse as YAML;
* `json`: parse as JSON;
* `html`: parse as HTML.

```bash
wordpress-to-kirby generate my-blog.xml --parse=content=html
```

### `--serialize=<rules>`
		
Instructions to serialize some fields, specified as `<key>=<serializer>,<key>=<serializer>,…`.

The `--serialize` option can be used multiple times.

Supported serializers:

* `php`: serialize as PHP object;
* `yaml`: serialize as YAML;
* `json`: serialize as JSON;
* `html`: serialize as HTML.

```bash
wordpress-to-kirby generate my-blog.xml --serialize=content=html
```

### `--exclude-fields=<fields>`

Exclude certain fields from the output, specified as a comma-separated list of fields.

The `--exclude-fields` option can be used multiple times.

```bash
wordpress-to-kirby generate my-blog.xml --exclude-fields=guid_isPermalink,comment_status,ping_status
```

### `--include-fields=<fields>`

Only include certain fields from the output, specified as a comma-separated list of fields. When `--include-fields` is specified, the `--exclude-fields` option is ignored.

The `--include-fields` option can be used multiple times.

```bash
wordpress-to-kirby generate my-blog.xml --include-fields=title,content,uuid
```

### `--exclude-types=<types>`

Exclude certain post types from the output, specified as a comma-separated list of post types.

The `--exclude-types` option can be used multiple times.

```bash
wordpress-to-kirby generate my-blog.xml --exclude-types=nav_menu_item
```

### `--include-types=<types>`
	
Only include certain post types from the output, specified as a comma-separated list of post types. When `--include-types` is specified, the `--exclude-types` option is ignored.

The `--include-types` option can be used multiple times.

```bash
wordpress-to-kirby generate my-blog.xml --include-types=post,page,film,venue
```

### `--only-metadata`

For the `generate` command, only generate the `metadata.json` file.

## Keys extracted from the XML

The following keys are extracted from the top level of the WordPress XML export:

`title`, `link`, `pubDate`, `creator`, `guid`, `guid_isPermaLink`, `description`, `content`, `excerpt`, `post_id`, `post_date`, `post_date_gmt`, `post_modified`, `post_modified_gmt`, `comment_status`, `ping_status`,  `post_name`, `status`, `post_parent`, `menu_order`, `post_type`, `post_password`, `is_sticky`, `attachment_url` (only populated for the `attachment` post type).

Fields from `<wp:postmeta>` are included in the output with the `postmeta*` prefix.

## Keys generated from scratch

* `uuid: <string>`, containing 16 random alphanumeric characters.
* `template: 'attachment'` is added to attachments.

## Related tools

Once you have produced a directory of Kirby content files, you can use [`yamatter`](https://github.com/danburzo/yamatter/) with the `--kirby` flag to further modify the fields.

## Prior art

* [`splorp/wordpress-xml-to-kirby`](https://github.com/splorp/wordpress-xml-to-kirby)