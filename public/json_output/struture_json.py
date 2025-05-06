import json

# Abrir os dois arquivos
with open('./STRONGS_WORD_TRADUZIDO.json', 'r', encoding='utf-8') as f_traduzido:
    traduzidos = json.load(f_traduzido)

with open('./STRONGS_WORD.json', 'r', encoding='utf-8') as f_original:
    originais = json.load(f_original)

# Criar um dicionário com os dados originais por ID para acesso rápido
originais_por_id = {item['ID']: item for item in originais}

# Lista para armazenar os itens mesclados
mesclados = []

# Mesclar com base no ID
for t in traduzidos:
    id_ = t['ID']
    original = originais_por_id.get(id_, {})
    
    # Juntar os dois dicionários (campos do original + traduzido)
    combinado = {**original, **t}
    
    mesclados.append(combinado)

# Salvar o resultado em um novo arquivo JSON
with open('STRONGS_WORD_COMBINADO.json', 'w', encoding='utf-8') as f_saida:
    json.dump(mesclados, f_saida, ensure_ascii=False, indent=4)

print("JSON combinado salvo como STRONGS_WORD_COMBINADO.json")
