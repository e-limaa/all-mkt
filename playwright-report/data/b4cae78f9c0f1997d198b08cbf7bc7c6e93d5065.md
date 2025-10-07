# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e6]:
      - img [ref=e8]
      - img [ref=e15]
    - generic [ref=e21]:
      - generic [ref=e22]:
        - heading "Criar conta" [level=4] [ref=e23]
        - paragraph [ref=e24]: Informe seu e-mail corporativo e defina uma senha com pelo menos 8 caracteres.
      - generic [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Email
              - textbox "Email" [ref=e30]
            - generic [ref=e31]:
              - generic [ref=e32]: Senha
              - textbox "Senha" [ref=e33]
          - button "Criar conta" [ref=e34] [cursor=pointer]:
            - img
            - text: Criar conta
        - paragraph [ref=e35]:
          - text: Já possui cadastro?
          - link "Faça login" [ref=e36] [cursor=pointer]:
            - /url: /login
      - paragraph [ref=e38]: Ao criar a conta você concorda em seguir as diretrizes de uso e segurança definidas pelo time ALL MKT.
  - alert [ref=e39]
```