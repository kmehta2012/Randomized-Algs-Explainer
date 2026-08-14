local slug_pattern = "^[a-z0-9]+%-?[a-z0-9%-]*$"
local definitions = {}
local definition_ids = {}

local function fail(message)
  quarto.log.error("explain: " .. message)
  os.exit(1)
end

local function is_slug(value)
  if type(value) ~= "string" or not value:match(slug_pattern) then
    return false
  end

  return not value:match("%-%-") and not value:match("%-$")
end

local function copy_inlines(value)
  if pandoc.utils.type(value) == "Inlines" then
    return value
  end

  return quarto.utils.string_to_inlines(pandoc.utils.stringify(value))
end

local function copy_blocks(value)
  local value_type = pandoc.utils.type(value)
  if value_type == "Blocks" then
    return value
  elseif value_type == "Inlines" then
    return pandoc.Blocks({pandoc.Plain(value)})
  end

  return quarto.utils.string_to_blocks(pandoc.utils.stringify(value))
end

local function load_definitions(meta)
  definitions = {}
  definition_ids = {}

  if meta.annotations == nil then
    fail("annotations.yml must define a top-level 'annotations' map")
  end

  for id, entry in pairs(meta.annotations) do
    if not is_slug(id) then
      fail("annotation id '" .. tostring(id) .. "' is not a safe lowercase slug")
    end
    if type(entry) ~= "table" or entry.title == nil or entry.content == nil then
      fail("annotation '" .. id .. "' must define both title and content")
    end

    definitions[id] = {
      title = copy_inlines(entry.title),
      content = copy_blocks(entry.content),
    }
    table.insert(definition_ids, id)
  end

  table.sort(definition_ids)
end

local function require_definition(id, context)
  if not is_slug(id) then
    fail(context .. " uses unsafe annotation id '" .. tostring(id) .. "'")
  end
  if definitions[id] == nil then
    fail(context .. " references missing annotation '" .. id .. "'")
  end
end

local function is_escaped(source, position)
  local backslashes = 0
  local cursor = position - 1
  while cursor >= 1 and source:sub(cursor, cursor) == "\\" do
    backslashes = backslashes + 1
    cursor = cursor - 1
  end
  return backslashes % 2 == 1
end

local function skip_space(source, position)
  while position <= #source and source:sub(position, position):match("%s") do
    position = position + 1
  end
  return position
end

local function parse_group(source, position, label)
  position = skip_space(source, position)
  if source:sub(position, position) ~= "{" then
    fail("malformed \\explain: expected " .. label .. " in braces")
  end

  local depth = 1
  local cursor = position + 1
  while cursor <= #source do
    local char = source:sub(cursor, cursor)
    if not is_escaped(source, cursor) then
      if char == "{" then
        depth = depth + 1
      elseif char == "}" then
        depth = depth - 1
        if depth == 0 then
          return source:sub(position + 1, cursor - 1), cursor + 1
        end
      end
    end
    cursor = cursor + 1
  end

  fail("malformed \\explain: unclosed " .. label .. " group")
end

local function command_at(source, position)
  if source:sub(position, position + 7) ~= "\\explain" then
    return false
  end
  local following = source:sub(position + 8, position + 8)
  return following == "" or not following:match("[A-Za-z@]")
end

local function rewrite_math(source)
  local output = {}
  local cursor = 1
  local found = false

  while cursor <= #source do
    local start_at = source:find("\\explain", cursor, true)
    if start_at == nil then
      table.insert(output, source:sub(cursor))
      break
    end

    table.insert(output, source:sub(cursor, start_at - 1))
    if not command_at(source, start_at) then
      table.insert(output, "\\explain")
      cursor = start_at + 8
    else
      local id, after_id = parse_group(source, start_at + 8, "annotation id")
      local body, after_body = parse_group(source, after_id, "annotated expression")

      if body:find("\\explain", 1, true) then
        fail("nested \\explain commands are not supported")
      end

      local forbidden_commands = {
        "\\href", "\\url", "\\includegraphics", "\\htmlClass",
        "\\htmlId", "\\htmlStyle", "\\htmlData",
      }
      for _, command in ipairs(forbidden_commands) do
        if body:find(command, 1, true) then
          fail("annotated expressions may not contain trusted KaTeX command '" .. command .. "'")
        end
      end

      id = id:match("^%s*(.-)%s*$")
      require_definition(id, "math")
      table.insert(output, "\\htmlData{annotation=" .. id .. "}{" .. body .. "}")
      cursor = after_body
      found = true
    end
  end

  return table.concat(output), found
end

local function span_filter(span)
  if not span.classes:includes("explain") then
    return nil
  end

  local id = span.attributes["data-annotation"]
  if id == nil or id == "" then
    fail("prose annotation is missing data-annotation")
  end
  require_definition(id, "prose")
  span.attributes["data-annotation"] = id
  return span
end

local function math_filter(math)
  local rewritten, found = rewrite_math(math.text)
  if not found then
    return nil
  end

  local math_kind = math.mathtype == "DisplayMath" and "display" or "inline"
  local encoded = quarto.base64.encode(rewritten)
  local html = '<span class="explain-math ' .. math_kind .. '" data-explain-tex="' .. encoded .. '"></span>'
  return pandoc.RawInline("html", html)
end

local function definition_container()
  local blocks = pandoc.Blocks({})
  for _, id in ipairs(definition_ids) do
    local definition = definitions[id]
    local title = pandoc.Div(
      pandoc.Blocks({pandoc.Plain(definition.title)}),
      pandoc.Attr("", {"annotation-definition__title"})
    )
    local content = pandoc.Div(
      definition.content,
      pandoc.Attr("", {"annotation-definition__content"})
    )
    blocks:insert(pandoc.Div(
      pandoc.Blocks({title, content}),
      pandoc.Attr("annotation-definition-" .. id, {"annotation-definition"}, {
        ["data-annotation-definition"] = id,
      })
    ))
  end

  return pandoc.Div(
    blocks,
    pandoc.Attr("annotation-definitions", {"annotation-definitions"}, {hidden = "hidden"})
  )
end

local function add_dependency()
  quarto.doc.add_html_dependency({
    name = "explain-annotations",
    version = "0.1.0",
    scripts = {{path = "explain.js", afterBody = true}},
    stylesheets = {"explain.css"},
  })
end

return {
  {
    Meta = load_definitions,
  },
  {
    Span = span_filter,
    Math = math_filter,
  },
  {
    Pandoc = function(doc)
      if quarto.doc.is_format("html:js") then
        add_dependency()
        doc.blocks:insert(definition_container())
      end
      return doc
    end,
  },
}
