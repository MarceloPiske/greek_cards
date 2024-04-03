json = [
    {
        "tempo": "Presente",
        "tipos": [
            {
                "tipo": "Ativo",
                "singular": {
                    "primeira_pessoa": "λύω",
                    "segunda_pessoa": "λύεις",
                    "terceira_pessoa": "λύει"
                },
                "plural": {
                    "primeira_pessoa": "λύομεν",
                    "segunda_pessoa": "λύετε",
                    "terceira_pessoa": "λύουσι(ν)"
                }
            },
            {
                "tipo": "Médio/Passivo",
                "singular": {
                    "primeira_pessoa": "λύομαι",
                    "segunda_pessoa": "λύῃ",
                    "terceira_pessoa": "λύεται"
                },
                "plural": {
                    "primeira_pessoa": "λυόμεθα",
                    "segunda_pessoa": "λύεσθε",
                    "terceira_pessoa": "λύονται"
                }
            }
        ]
    },
    {
        "tempo": "Imperfeito",
        "tipos": [
            {
                "tipo": "Ativo",
                "singular": {
                    "primeira_pessoa": "ἔλυόν",
                    "segunda_pessoa": "ἔλύες",
                    "terceira_pessoa": "ἔλυε(ν)"
                },
                "plural": {
                    "primeira_pessoa": "ἐλυόμεν",
                    "segunda_pessoa": "ἐλύετε",
                    "terceira_pessoa": "ἔλυον"
                }
            },
            {
                "tipo": "Médio/Passivo",
                "singular": {
                    "primeira_pessoa": "ἐλυόμην",
                    "segunda_pessoa": "ἐλύου",
                    "terceira_pessoa": "ἐλύετο"
                },
                "plural": {
                    "primeira_pessoa": "ἐλυόμεθα",
                    "segunda_pessoa": "ἐλύεσθε",
                    "terceira_pessoa": "ἐλύοντο"
                }
            }
        ]
    },
    {
        "tempo": "Aoristo",
        "tipos": [
            {
                "tipo": "Ativo",
                "singular": {
                    "primeira_pessoa": "ἔλυσα",
                    "segunda_pessoa": "ἔλυσας",
                    "terceira_pessoa": "ἔλυσε(ν)"
                },
                "plural": {
                    "primeira_pessoa": "ἐλύσαμεν",
                    "segunda_pessoa": "ἐλύσατε",
                    "terceira_pessoa": "ἔλυσαν"
                }
            },
            {
                "tipo": "Médio",
                "singular": {
                    "primeira_pessoa": "ἐλυσάμην",
                    "segunda_pessoa": "ἐλύσω",
                    "terceira_pessoa": "ἐλύσατο"
                },
                "plural": {
                    "primeira_pessoa": "ἐλυσάμεθα",
                    "segunda_pessoa": "ἐλύσασθε",
                    "terceira_pessoa": "ἐλύσαντο"
                }
            },
            {
                "tipo": "Passivo",
                "singular": {
                    "primeira_pessoa": "ἐλύθην",
                    "segunda_pessoa": "ἐλύθης",
                    "terceira_pessoa": "ἐλύθη(ν)"
                },
                "plural": {
                    "primeira_pessoa": "ἐλύθημεν",
                    "segunda_pessoa": "ἐλύθητε",
                    "terceira_pessoa": "ἐλύθησαν"
                }
            },
            {
                "tipo": "Aoristo Segundo",
                "singular": {
                    "primeira_pessoa": "ἔλαβον",
                    "segunda_pessoa": "ἔλαβες",
                    "terceira_pessoa": "ἔλαβε(ν)"
                },
                "plural": {
                    "primeira_pessoa": "ἐλάβομεν",
                    "segunda_pessoa": "ἐλάβετε",
                    "terceira_pessoa": "ἔλαβον"
                }
            }
        ]
    },
    {
        "tempo": "Futuro",
        "tipos": [
            {
                "tipo": "Ativo",
                "singular": {
                    "primeira_pessoa": "λύσω",
                    "segunda_pessoa": "λύσεις",
                    "terceira_pessoa": "λύσει"
                },
                "plural": {
                    "primeira_pessoa": "λύσομεν",
                    "segunda_pessoa": "λύσετε",
                    "terceira_pessoa": "λύσουσι(ν)"
                }
            },
            {
                "tipo": "Médio",
                "singular": {
                    "primeira_pessoa": "λύσομαι",
                    "segunda_pessoa": "λύσῃ",
                    "terceira_pessoa": "λύσεται"
                },
                "plural": {
                    "primeira_pessoa": "λυσόμεθα",
                    "segunda_pessoa": "λύσεσθε",
                    "terceira_pessoa": "λύσονται"
                }
            },
            {
                "tipo": "Passivo",
                "singular": {
                    "primeira_pessoa": "λυθήσομαι",
                    "segunda_pessoa": "λυθήσῃ",
                    "terceira_pessoa": "λυθήσεται"
                },
                "plural": {
                    "primeira_pessoa": "λυθησόμεθα",
                    "segunda_pessoa": "λυθήσεσθε",
                    "terceira_pessoa": "λυθήσονται"
                }
            }
        ]
    },
    {
        "tempo": "Perfeito",
        "tipos": [
            {
                "tipo": "Ativo",
                "singular": {
                    "primeira_pessoa": "λέλυκα",
                    "segunda_pessoa": "λεέλυκας",
                    "terceira_pessoa": "λέλυκε(ν)"
                },
                "plural": {
                    "primeira_pessoa": "λελύκαμεν",
                    "segunda_pessoa": "λελύκατε",
                    "terceira_pessoa": "λέλυκαν / λελύκασι(ν)"
                }
            },
            {
                "tipo": "Médio/Passivo",
                "singular": {
                    "primeira_pessoa": "λέλυμαι",
                    "segunda_pessoa": "λέλυσαι",
                    "terceira_pessoa": "λέλυται"
                },
                "plural": {
                    "primeira_pessoa": "λελύμεθα",
                    "segunda_pessoa": "λέλυσθε",
                    "terceira_pessoa": "λέλυνται"
                }
            }
        ]
    }
]

let table_html = "" 
for (let tempo of json) {
    table_html += `<table>`
    let thead = "<thead>"
    let tbody = "<tbody>"
    
    let html_tempo = `<tr>
                <th colspan="5">${tempo.tempo}</th>
            </tr>`
    let html_tipos = `<tr>
                <th>Pessoa</th>`

    ps = `<tr> <th>1ª Singular</th>`
    ss = `<tr> <th>2ª Singular</th>`
    ts = `<tr> <th>3ª Singular</th>`
    pp = `<tr> <th>1ª Plural</th>`
    sp = `<tr> <th>2ª Plural</th>`
    tp = `<tr> <th>3ª Plural</th>`
    console.log(tempo.tipos);
    for (const tipos of tempo.tipos) {
        html_tipos += `<th>${tipos.tipo}</th>`
        console.log(tipos);
        ps += `<td>${tipos.singular.primeira_pessoa}</td>`
        ss += `<td>${tipos.singular.segunda_pessoa}</td>`
        ts += `<td>${tipos.singular.terceira_pessoa}</td>`

        pp += `<td>${tipos.plural.primeira_pessoa}</td>`
        sp += `<td>${tipos.plural.segunda_pessoa}</td>`
        tp += `<td>${tipos.plural.terceira_pessoa}</td>`
    }

    html_tipos += "</tr>"
    thead += html_tempo + html_tipos + "</thead>"

    ps += "</tr>"
    ss += "</tr>"
    ts += "</tr>"
    pp += "</tr>"
    sp += "</tr>"
    tp += "</tr>"
    tbody += ps + ss + ts + pp + sp + tp + "</tbody>"

    table_html += thead + tbody + "</table>"
}
document.querySelector("#container").innerHTML = table_html