(function()
{
    "use strict";
    let lp = require("./luaparse.js");
    let cont = require("fs").readFileSync(process.argv[2], "utf8");

    let parse = lp.parse(cont, {
        wait: true,
        comments: true
    });

    let hungarian_shit = [
        "p", "psz", "str",
        "cv", "convar",
        "n", "i", "f", "flt", "int", "num",
        "vec", "ang",
    ];

    let
        strHungarian = 0,
        UpperCamelCase = 1,
        lowerCamelCase = 2,
        lower_case = 3,
        unknowncase = 4;


    let FindCase = (str) =>
    {
        if (str.substring(0,2) == "g_" || str.substring(0,2) == "m_")
            return strHungarian;
        for (let i = 0; i < hungarian_shit.length; i++)
            if (str.substring(0, hungarian_shit[i].length) == hungarian_shit[i] &&
                str.substring(hungarian_shit[i].length).match(/^[A-Z0-9]/))
                return strHungarian;

        if (str.match(/^[A-Z]/))
            return UpperCamelCase;

        if (str.match(/^[a-z][^_]*$/))
            return lowerCamelCase;

        if (str.match(/[A-Z]/))
            return unknowncase;

        return lower_case;

    }

    let isIdentifierStart = (charCode) =>
    {
        return (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122) || 95 === charCode || charCode >= 0x7F;
    }

    let isIdentifierPart = (charCode) =>
    {
        return (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122) || 95 === charCode || (charCode >= 48 && charCode <= 57) || charCode >= 0x7F;
    }

    let isIdentifier = (str) =>
    {

        if (!isIdentifierStart(str.charCodeAt(0)))
            return false;
        for (let i = 1; i < str.length; i++)
            if (!isIdentifierPart(str.charCodeAt(i)))
                return false;

        return true;
    }

    let IsGarrySyntax = function(value)
    {
        return typeof value == "string" && (value == "!=" || value == "!" || value == "&&" || value == "||"
                || value.substring(0,2) == "//" || value.substring(0,2) == "/*");
    }

    let garry_ops      = [0, 0];
    let garry_preops   = [0, 0];
    let garry_comments = [0, 0];
    let string_types   = [0, 0];
    let char_types     = [0, 0];
    let scope_paranth  = [0, 0];
    let scope_space    = [0, 0];
    let scope_space2   = [0, 0];
    let tabs           = [0, 0];
    let array_indexing = [0, 0];
    let cases          = [0, 0, 0, 0, 0];

    let memes;
    let results = [];

    const make_function = (func) =>
    {


    }

    var getlocals = (chunk, locals) =>
    {
        locals = locals ? locals : [];
        for (let i = 0; i < chunk.body.length; i++)
        {

            let item = chunk.body[i];

            if (item.type === "LocalStatement")
            {
                for (let z = 0; z < item.variables.length; z++)
                {
                    let v = item.variables[z];

                    locals.push(v.name);
                }
            }

            if (item.body)
                getlocals(item, locals);
            else if (item.clauses)
                for (let y = 0; y < item.clauses.length; y++)
                    getlocals(item.clauses[y], locals);

        }

        return locals;

    }

    let CreateConsistency = (arr) =>
    {

        let top_n = 0;
        let all = 0;

        for (let i = 0; i < arr.length; i++)
        {
            all += arr[i];
            if (top_n < arr[i])
                top_n = arr[i];
        }

        return (top_n / all - (arr.length - 1) / arr.length) * arr.length;
    }

    let ConsistencyPrint = (name, arr) =>
    {
        console.log(name, arr);
    }


    let end = () =>
    {
        // run analysis of tabs

        let matches = ("\r\n" + cont).match(/\r?\n([ \t]+)/g);

        if (matches)
            for (let i = 0; i < matches.length; i++)
            {

                let tab = matches[i].indexOf('\t') !== -1;
                let space = matches[i].indexOf(' ') !== -1;

                tabs[0] += tab + 0;
                tabs[1] += space + 0;

            }

        let locals = getlocals(lp.parse(cont));

        for (let i = 0; i < locals.length; i++)
            cases[FindCase(locals[i])]++;


        ConsistencyPrint("naming conventions", cases);
        ConsistencyPrint("~= vs !=", garry_ops);
        ConsistencyPrint("not, and, or vs !, &&, ||", garry_preops);
        ConsistencyPrint("-- vs //, /*", garry_comments);
        ConsistencyPrint("' vs \" for single chars", char_types);
        ConsistencyPrint("' vs \" for strings", string_types);
        ConsistencyPrint("block ( vs block(", scope_space);
        ConsistencyPrint("block vs block(", scope_paranth);
        ConsistencyPrint("block( ) vs block()", scope_space2);
        ConsistencyPrint("tabs vs spaces", tabs);
        ConsistencyPrint("['index'] = vs .index =", array_indexing);
    }
    let fn = () =>
    {
        if ((memes = parse.lex()).value === "<eof>")
            return end();
        if (memes.type & 32 &&memes.value === "~=" || memes.value == "!=")
                garry_ops[IsGarrySyntax(memes.value) + 0]++;

        if (memes.type === "Comment")
            garry_comments[IsGarrySyntax(memes.raw) + 0]++;

        if (memes.type & 4 &&
            (memes.value == "!" || memes.value == "not" || memes.value == "&&" || memes.value == "||" || memes.value == "and" || memes.value == "or"))
            garry_preops[IsGarrySyntax(memes.value) + 0]++;

        if (memes.type & 4 &&
            (memes.value == "if" || memes.value == "while" || memes.value == "repeat"))
        {
            let space = cont.charAt(memes.range[1]) == ' ';

            let paranth = cont.charAt(memes.range[1] + space) == '(';
            if (paranth)
            {
                let space2 = cont.charAt(memes.range[1] + space + paranth) == ' ';
                scope_space2[space2 + 0]++;
                scope_space[space + 0]++;
            }
            scope_paranth[paranth + 0]++;
        }
        if (results.length > 0 && results[results.length - 1].type & 8 && memes.type & 32 &&
            (memes.value == '(' || memes.value == '['))
        {
            let space = cont.charAt(memes.range[0] - 1) == ' ';

            let space2 = cont.charAt(memes.range[0] + 1) == ' ';

            scope_space2[space2 + 0]++;

            scope_space[space + 0]++;
        }

        if (results.length > 1)
        {

            let len = results.length;

            if (memes.type & 32 && memes.value === '=' &&
                results[len - 1].type & 32 && results[len - 1].value === ']' &&
                results[len - 2].type & 2 &&
                isIdentifier(results[len-2].value))
                array_indexing[0]++;

            if (memes.type & 32 && memes.value === '=' &&
                results[len - 1].type & 8 &&
                results[len - 2].type & 32 && results[len - 2].value == '.')
                array_indexing[1]++;

        }

        if (memes.type & 2)
        {
            if (memes.value.length == 1)
                char_types[(cont.charAt(memes.range[0]) == '"') + 0]++;
            else
                string_types[(cont.charAt(memes.range[0]) == '"') + 0]++;
        }
        process.nextTick(fn);

        results.push(memes);
    }
    fn();
})();
