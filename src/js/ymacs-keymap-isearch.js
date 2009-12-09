//> This file is part of Ymacs, an Emacs-like editor for the Web
//> http://www.ymacs.org/
//>
//> Copyright (c) 2009, Mihai Bazon, Dynarch.com.  All rights reserved.
//>
//> Redistribution and use in source and binary forms, with or without
//> modification, are permitted provided that the following conditions are
//> met:
//>
//>     * Redistributions of source code must retain the above copyright
//>       notice, this list of conditions and the following disclaimer.
//>
//>     * Redistributions in binary form must reproduce the above copyright
//>       notice, this list of conditions and the following disclaimer in
//>       the documentation and/or other materials provided with the
//>       distribution.
//>
//>     * Neither the name of Dynarch.com nor the names of its contributors
//>       may be used to endorse or promote products derived from this
//>       software without specific prior written permission.
//>
//> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
//> EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//> IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
//> PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE
//> FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
//> CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
//> SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
//> INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
//> CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
//> ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
//> THE POSSIBILITY OF SUCH DAMAGE.

// @require ymacs-keymap.js

DEFINE_SINGLETON("Ymacs_Keymap_ISearch", Ymacs_Keymap, function(D, P){

        D.KEYS = {
                "C-g && ESCAPE": [ "isearch_abort", true ],
                "C-w": "isearch_yank_word_or_char",
                "C-s": "isearch_forward",
                "C-r": "isearch_backward",
                "BACKSPACE": function() {
                        if (this.getMinibuffer().point() > this._isearchContext.mbMark.getPosition()) {
                                this.getMinibuffer().cmd("backward_delete_char");
                                this.cmd("goto_char", this._isearchContext.point);
                                updateIsearch.call(this, this._isearchContext.forward);
                        }
                },
                "ENTER": "isearch_abort"
        };

        D.CONSTRUCT = function() {
                this.defaultHandler = [ "isearch_printing_char" ];
        };

        function initIsearch(fw) {
                if (!this._isearchContext) {
                        this.pushKeymap(Ymacs_Keymap_ISearch());
                        this.cmd("set_mark_command");
                        this.setMinibuffer(fw ? "I-Search: " : "I-Search backward: ");
                        this._isearchContext = {
                                forward : fw,
                                point   : this.point(),
                                mbMark  : this.getMinibuffer().createMarker(null, true)
                        };
                        return true;
                }
        };

        function updateIsearch(fw) {
                this._isearchContext.forward = fw;
                this._isearchContext.point = this.point();
                var text = getText(this);
                if (!/\S/.test(text) && this._isearchLastText) {
                        this.getMinibuffer()._placeUndoBoundary();
                        this.getMinibuffer().cmd("insert", this._isearchLastText);
                        text = this._isearchLastText;
                }
                return doSearch.call(this, text);
        };

        function doSearch(text) {
                if (text == null)
                        text = getText(this);
                var found = this.cmd("bind_variables", { case_fold_search: text == text.toLowerCase() },
                                     this.cmd,
                                     this._isearchContext.forward ? "search_forward" : "search_backward",
                                     text);
                if (found)
                        this.cmd("recenter_top_bottom");
                return found;
        };

        function getText(o) {
                return o.cmd("isearch_get_search_text");
        };

        Ymacs_Buffer.newCommands({

                isearch_get_search_text: Ymacs_Interactive(function() {
                        if (this._isearchContext) {
                                return this.getMinibuffer()._bufferSubstring(this._isearchContext.mbMark);
                        }
                }),

                isearch_forward: Ymacs_Interactive(function() {
                        if (!initIsearch.call(this, true)) {
                                if (!updateIsearch.call(this, true))
                                        this.signalError("No more forward occurrences of the search text");
                        }
                }),

                isearch_forward_regexp: Ymacs_Interactive(function() {
                        this.signalError("Not implemented, but should be easy.  Volunteers?");
                }),

                isearch_backward_regexp: Ymacs_Interactive(function() {
                        this.signalError("Not implemented, but should be easy.  Volunteers?");
                }),

                isearch_backward: Ymacs_Interactive(function() {
                        if (!initIsearch.call(this, false)) {
                                if (!updateIsearch.call(this, false))
                                        this.signalError("No more backward occurrences of the search text");
                        }
                }),

                isearch_yank_word_or_char: Ymacs_Interactive(function() {
                        var pos = this.point();
                        this.cmd("forward_word");
                        var pos2 = this.point();
                        if (pos2 != pos) {
                                var word = this._bufferSubstring(pos, pos2);
                                this.getMinibuffer()._placeUndoBoundary();
                                this.getMinibuffer().cmd("insert", word.toLowerCase());
                        }
                }),

                isearch_printing_char: Ymacs_Interactive(function() {
                        var ev = this.interactiveEvent();
                        if (ev.charCode && !ev.ctrlKey && !ev.altKey) {
                                this.getMinibuffer().cmd("self_insert_command");
                                var text = getText(this);
                                this.cmd("goto_char", this._isearchContext.point);
                                doSearch.call(this, text);
                                return ev.domStop = true;
                        } else if (ev.keyCode != 0 || ev.ctrlKey || ev.altKey) {
                                this.cmd("isearch_abort");
                                return false;
                        }
                }),

                isearch_abort: Ymacs_Interactive(function(cancelled) {
                        if (!cancelled)
                                this._isearchLastText = getText(this);
                        this.setMinibuffer("");
                        this.popKeymap(Ymacs_Keymap_ISearch());
                        this._isearchContext.mbMark.destroy();
                        this._isearchContext = null;
                        if (cancelled)
                                this.cmd("exchange_point_and_mark");
                        return true;
                })

        });

});
