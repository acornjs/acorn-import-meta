"use strict"

const skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g

module.exports = function (acorn) {
  const tt = acorn.tokTypes

  acorn.plugins.importMeta = function (instance) {

    instance.extend("parseExprAtom", function (superF) {
      return function(refDestructuringErrors) {
        if (this.type !== tt._import) return superF.call(this, refDestructuringErrors)

        if (!this.options.allowImportExportEverywhere && !this.inModule) {
          this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'")
        }

        let node = this.startNode()
        node.meta = this.parseIdent(true)
        if (!this.eat(tt.dot)) this.unexpected()
        node.property = this.parseIdent(true)
        if (node.property.name !== "meta") {
          this.raiseRecoverable(node.property.start, "The only valid meta property for import is import.meta")
        }
        return this.finishNode(node, "MetaProperty")
      }
    })

    instance.extend("parseStatement", function (superF) {
      return function(declaration, topLevel, exports) {
        if (this.type !== tt._import) return superF.call(this, declaration, topLevel, exports)

        // Peek at next token
        skipWhiteSpace.lastIndex = this.pos
        let skip = skipWhiteSpace.exec(this.input)
        let next = this.pos + skip[0].length
        const maybeMeta = this.input.slice(next, next + 1) === "."
        if (!maybeMeta) return superF.call(this, declaration, topLevel, exports)

        let node = this.startNode()
        let expr = this.parseExpression()
        return this.parseExpressionStatement(node, expr)
      }
    })
  }
  return acorn
}
