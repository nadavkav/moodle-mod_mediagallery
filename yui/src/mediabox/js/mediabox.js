var MEDIABOX = function() {
    MEDIABOX.superclass.constructor.apply(this, arguments);
};

Y.extend(MEDIABOX, Y.Base, {
    initializer : function(config) {
        this.enable();
        this.build();
        this._sidebarwidth = 300;
        this._navbarheight = 60;
        this.currentitem = null;
        this._audiowidth = 250;
        this._audioheight = 275;
        this._videowidth = 640;
        this._videoheight = 390;
        this._fullscreenavail = screenfull.enabled && !Y.one('body').hasClass('ui-mobile-viewport');
    },

    build : function() {
        var _this = this;
        var strnext = M.str.moodle.next;
        var strprev = M.str.moodle.previous;
        var strviewfull = M.str.mod_mediagallery.viewfullsize;
        var strtoggle = M.str.mod_mediagallery.togglesidebar;
        var strfullscreen = M.str.mod_mediagallery.togglefullscreen;
        var strclose = M.str.mod_mediagallery.close;
        var actions = '<img class="sidebartoggle" src="'+M.util.image_url('toggle', 'mod_mediagallery')+'" title="'+strtoggle+'" alt="'+strtoggle+'"/>';
        actions += '<img class="prev" src="'+M.util.image_url('left', 'mod_mediagallery')+'" title="'+strprev+'" alt="'+strprev+'"/>';
        actions += '<img class="next" src="'+M.util.image_url('right', 'mod_mediagallery')+'" title="'+strnext+'" alt="'+strnext+'"/>';
        actions += '<img class="open" src="'+M.util.image_url('download', 'mod_mediagallery')+'" title="'+strviewfull+'" alt="'+strviewfull+'"/>';
        if (this._fullscreenavail) {
            actions += '<img class="fullscreen" src="'+M.util.image_url('fullscreen', 'mod_mediagallery')+'" title="'+strfullscreen+'" alt="'+strfullscreen+'"/>';
        }
        actions += '<img class="mbclose" src="'+M.util.image_url('close', 'mod_mediagallery')+'" title="'+strclose+'" alt="'+strclose+'"/>';

        var template = '<div id="mediabox"><div id="mediabox-content-wrap"><div id="mediabox-content"></div></div>';
        template += '<div id="mediabox-sidebar"><div id="mediabox-sidebar-actions">'+actions+'</div>';
        template += '<div id="mediabox-metainfo"></div><hr/><div id="mediabox-social"></div><hr/><div id="mediabox-comments"></div>';
        template += '</div><div id="mediabox-navbar"><div id="mediabox-navbar-container"></div></div></div><div id="mediabox-overlay"></div>';
        Y.Node.create(template).appendTo('body');
        this.overlay = Y.one('#mediabox-overlay');
        this.mediabox = Y.one('#mediabox');
        this.navbar = Y.one('#mediabox-navbar');
        this.resizeoverlay();

        this.album = Y.all('a[rel^=mediabox], area[rel^=mediabox], a[data-mediabox], area[data-mediabox]').getDOMNodes();

        this.overlay.on('click', function() {
            _this.stop();
        });

        Y.delegate('click', function(e) {
            if (e.currentTarget.get('id') === 'mediabox-navbar-container') {
                return false;
            }
            _this.stop();
        }, '#mediabox', '#mediabox-navbar, #mediabox-navbar-container');

        // Sidebar hide/expand button.
        var sidebar = Y.one('#mediabox-sidebar');
        Y.one('#mediabox-sidebar-actions .sidebartoggle').on('click', function() {
            _this.mediabox.toggleClass('sidebarhidden');
            _this.resizeoverlay();
            _this.repositionitem();
        });

        for (var i = 0; i < this.album.length; i++) {
            var navitem = Y.Node.create('<div class="navitem"></div>');
            navitem.setAttribute('data-id', i);
            var item = Y.Node.create('<img/>');
            item.setAttribute('src', this.album[i].children[0].getAttribute('src'));
            item.appendTo(navitem);

            navitem.appendTo('#mediabox-navbar-container');
        }
        Y.delegate('click', function(e) {
            e.preventDefault();
            _this.changeitem(e.currentTarget.getAttribute('data-id'));
        }, '#mediabox-navbar', '.navitem');

        // Like button and text.
        if (this.get('enablelikes')) {
            Y.Node.create(
                '<a class="like" href="#"><div class="like"></div>'+M.str.mod_mediagallery.like+'</a><span id="mediabox-likedby"></span>'
            ).appendTo('#mediabox-social');
        }

        // Like action.
        Y.delegate('click', function(e) {
            e.preventDefault();

            var action = 'like';
            var likedbyme = 1;
            var text = 'unlike';
            var icon = '<div class="unlike"></div>';
            if (Y.one('#mediabox-social a.like div').hasClass('unlike')) {
                action = 'unlike';
                likedbyme = 0;
                text = 'like';
                icon = '<div class="like"></div>';
            }

            var data = _this.get('metainfodata');
            data.id = _this.album[_this.currentitemindex].getAttribute(_this.get('dataidfield'));
            data.action = action;

            var config = {
                method: 'POST',
                data: data,
                on: {
                    success : function (id, response) {
                        var resp = JSON.parse(response.responseText);
                        _this.update_likes(resp.likes, likedbyme);
                    }
                },
                context: this,
                sync: true
            };

            Y.io(_this.get('metainfouri'), config);
            Y.one('#mediabox-social a.like').setHTML(icon + M.str.mod_mediagallery[text]);

        }, '#mediabox', '#mediabox-social a.like');

        Y.delegate('blur', function(e) {
            _this.enablenav();
        }, '#mediabox', '#mediabox-comments textarea');

        Y.delegate('focus', function(e) {
            _this.disablenav();
        }, '#mediabox', '#mediabox-comments textarea');

        Y.one('#mediabox-sidebar-actions .prev').on('click', function() {
            if (_this.currentitemindex === 0) {
                _this.changeitem(_this.album.length - 1);
            } else {
                _this.changeitem(_this.currentitemindex - 1);
            }
            return false;
        });

        Y.one('#mediabox-sidebar-actions .next').on('click', function() {
            if (_this.currentitemindex === _this.album.length - 1) {
                _this.changeitem(0);
            } else {
                _this.changeitem(_this.currentitemindex + 1);
            }
            return false;
        });

        Y.one('#mediabox-sidebar-actions .open').on('click', function() {
            window.open(_this.album[_this.currentitemindex].getAttribute('data-url'), '_blank');
            return false;
        });

        Y.one('#mediabox-sidebar-actions .mbclose').on('click', function() {
            _this.stop();
            return false;
        });

        if (this._fullscreenavail) {
            Y.one('#mediabox-sidebar-actions .fullscreen').on('click', function() {
                screenfull.toggle(_this.mediabox.getDOMNode());
                _this.setfullscreenimg();
                return false;
            });
        }

    },

    changeitem : function(itemnumber) {
        if (this.currentitemindex === itemnumber) {
            return;
        }
        var _this = this;
        var content = Y.one('#mediabox-content');
        var player = this.album[itemnumber].getAttribute('data-player');
        var type = this.album[itemnumber].getAttribute('data-type');
        content.empty();

        var current = null;
        if (current = this.navbar.one('.navitem.current')) {
            current.removeClass('current');
        }
        this.navbar.one('.navitem[data-id="'+itemnumber+'"]').addClass('current');

        var image = new Image();

        // Player type 2 is for videos. We don't need images for those.
        if (player !== "2" && type !== 'external') {
            image.onload = function() {
                var item = Y.Node.create('<img/>');
                item.setAttribute('src', _this.album[itemnumber].getAttribute('href'));
                content.all('img').remove();
                content.prepend(item);
                _this.repositionitem(image.width, image.height);
            };
            image.src = this.album[itemnumber].getAttribute('href');
        }

        this.currentitemindex = parseInt(itemnumber);
        this.currentitem = this.album[itemnumber];

        var metainfo = Y.one('#mediabox-metainfo');
        metainfo.empty();

        var data = this.get('metainfodata');
        data.id = this.currentitem.getAttribute(this.get('dataidfield'));
        data.action = 'metainfo';

        var config = {
            method: 'GET',
            data: data,
            on: {
                success : function (id, response) {
                    var resp;
                    try {
                        resp = JSON.parse(response.responseText);
                    } catch (e) {
                        return;
                    }
                    for (var i = 0; i < resp.fields.length; i++) {
                        if (resp.fields[i].value === '') {
                            continue;
                        }
                        Y.Node.create('<div class="metafield '+resp.fields[i].name+'"></div>').append(
                            '<div class="metaname">'+resp.fields[i].displayname+'</div>'
                        ).append(
                            '<div class="metavalue">'+resp.fields[i].value+'</div>'
                        ).appendTo(metainfo);
                    }

                    if (resp.commentcontrol) {
                        Y.one('#mediabox-comments').setHTML(resp.commentcontrol);
                        var opts = {
                            client_id : resp.client_id,
                            contextid : resp.contextid,
                            itemid : this.album[itemnumber].getAttribute(this.get('dataidfield')),
                            component : 'mod_mediagallery',
                            commentarea : 'item',
                            autostart : true
                        };
                        M.core_comment.init(Y, opts);
                    }
                    if (_this.get('enablelikes')) {
                        var icon = '<div class="like"></div>';
                        if (resp.likedbyme) {
                            icon = '<div class="unlike"></div>';
                            Y.one('#mediabox-social a.like').setHTML(icon + M.str.mod_mediagallery.unlike);
                        } else {
                            Y.one('#mediabox-social a.like').setHTML(icon + M.str.mod_mediagallery.like);
                        }

                        this.update_likes(resp.likes, resp.likedbyme);
                    }
                }
            },
            context: this,
            sync: true
        };
        if (this.get('metainfouri') !== '') {
            Y.io(this.get('metainfouri'), config);
        }

        if (player === "0" || player === "2") {
            this.embed_player(data.id);
            if (player === "0") {
                content.one('span.mediaplugin').addClass('audio');
            } else {
                content.one('span.mediaplugin').addClass('video');
            }
        }

        // YouTube embed.
        if (this.currentitem.getAttribute('data-type') === 'external') {
            content.empty();

            Y.Node.create('<iframe id="mediabox-youtube" type="text/html" width="'+this._videowidth+'" height="'+this._videoheight+'" src="'+this.currentitem.getAttribute('data-url') +'" frameborder="0">').appendTo(content);
            this.repositionitem();
        }

    },

    disablenav : function() {
        this.keyboardnav.detach();
    },

    embed_player : function(id) {
        var data = this.get('metainfodata');
        data.id = id;
        data.action = 'embed';
        var config = {
            method: 'GET',
            data: data,
            on: {
                success : function (id, response) {
                    var resp = JSON.parse(response.responseText);
                    if (resp.type === 'audio') {
                        Y.one('#mediabox-content').append(resp.html);
                        M.util.add_audio_player(resp.id, resp.url, false);
                    } else {
                        Y.one('#mediabox-content').setHTML(resp.html);
                        M.util.add_video_player(resp.id, resp.url, false);
                    }
                    M.mod_mediagallery.base.load_flowplayer();
                    if (resp.type === 'video') {
                        var plugin = Y.one('#mediabox-content .mediaplugin');
                        if (resp.flow) {
                            plugin.addClass('flow');
                            this.repositionitem(this._videowidth, this._videoheight);
                        } else {
                            this.repositionitem(plugin.get('offsetWidth'), plugin.get('offsetHeight'));
                        }
                    }
                }
            },
            context: this,
            sync: true
        };

        Y.io(this.get('metainfouri'), config);
    },

    enable : function() {
        var _this = this;
        return Y.one('body').all('a[rel^=mediabox], area[rel^=mediabox], a[data-mediabox], area[data-mediabox]').on('click', function(e) {
            e.preventDefault();
            _this.start(Y.one(e.currentTarget));
            return false;
        });
    },

    enablenav : function() {
        var _this = this;
        this.keyboardnav = Y.one(document).on('keyup', function(e) {
            _this.keyboardaction(e);
        });
    },

    keyboardaction : function(e) {
        var KEYCODE_ESC, KEYCODE_LEFTARROW, KEYCODE_RIGHTARROW, key, keycode;
        KEYCODE_ESC = 27;
        KEYCODE_LEFTARROW = 37;
        KEYCODE_RIGHTARROW = 39;
        keycode = event.keyCode;
        key = String.fromCharCode(keycode).toLowerCase();
        if (keycode === KEYCODE_ESC || key.match(/x|o|c/)) {
            this.stop();
        } else if (key === 'p' || keycode === KEYCODE_LEFTARROW) {
            if (this.currentitemindex !== 0) {
                this.changeitem(this.currentitemindex - 1);
            }
        } else if (key === 'n' || keycode === KEYCODE_RIGHTARROW) {
            if (this.currentitemindex !== this.album.length - 1) {
                this.changeitem(this.currentitemindex + 1);
            }
        }
    },

    repositionitem : function(width, height) {
        var offsetTop, offsetLeft, newwidth, newheight;
        var content = Y.one('#mediabox-content');
        var innercontent = content.get('children').get(0)[0];

        if (this.currentitem.getAttribute('data-player') === "2" || this.currentitem.getAttribute('data-type') === 'external') {
            // Flowplayer gets special treatment.
            if (content.one('.mediaplugin.flow')) {
                width = this._videowidth;
                height = this._videoheight;
            } else {
                width = innercontent.get('offsetWidth');
                height = innercontent.get('offsetHeight');
            }
        } else if (this.currentitem.getAttribute('data-player') === "0") {
            width = this._audiowidth;
            height = this._audioheight;
        } else if (width === undefined) {
            width = innercontent.get('naturalWidth');
            height = innercontent.get('naturalHeight');
        }

        var winwidth = Y.one('body').get('winWidth');
        var winheight = Y.one('body').get('winHeight');

        var maxwidth = winwidth - this.sidebarwidth();
        var maxheight = winheight - this._navbarheight;

        var newwidth = '';
        var newheight = '';
        if (width > maxwidth || height > maxheight) {
            if ((width / maxwidth) > (height / maxheight)) {
                newwidth = maxwidth;
                newheight = parseInt(height / (width / maxwidth), 10);
                offsetLeft = 0;
                offsetTop = (winheight - newheight) / 2;
            } else {
                newheight = maxheight;
                newwidth = parseInt(width / (height / maxheight), 10);
                offsetTop = 0;
                offsetLeft = (winwidth - newwidth - this.sidebarwidth()) / 2;
            }
            newwidth += 'px';
            newheight += 'px';
        } else {
            offsetLeft = (winwidth - width - this.sidebarwidth()) / 2;
            offsetTop = (winheight - height - this._navbarheight) / 2;
        }
        innercontent.setStyle('width', newwidth);
        innercontent.setStyle('height', newheight);
        if (this.currentitem.getAttribute('data-player') === "0") {
            if (content.one('.mediaplugin object')) {
                content.one('.mediaplugin object').setStyle('width', newwidth);
            }
        }

        content.setStyle('top', offsetTop + 'px');
        content.setStyle('left', offsetLeft + 'px');
    },

    resizeoverlay : function () {
        var viewportwidth = Y.one("body").get("docWidth");
        var viewportheight = Y.one("body").get("docHeight");
        this.overlay.setStyle('width', viewportwidth);
        this.overlay.setStyle('height', viewportheight);
    },

    sidebarwidth : function() {
        if (this.mediabox.hasClass('sidebarhidden')) {
            return 0;
        }
        return this._sidebarwidth;
    },

    start : function(target) {
        var _this = this;
        Y.on('windowresize', function() {
            _this.resizeoverlay();
            _this.repositionitem();
        });
        Y.one('body').addClass('noscroll mediaboxactive');
        this.overlay.setStyle('display', 'block');
        this.mediabox.setStyle('display', 'block');

        var itemnumber = 0;
        for (var i = 0; i < this.album.length; i++) {
            if (this.album[i].getAttribute('href') === target.getAttribute('href')) {
                itemnumber = i;
            }
        }

        if (this.currentitemindex !== itemnumber) {
            Y.one('#mediabox-content').empty();
        }

        this.setfullscreenimg();
        this.changeitem(itemnumber);
        this.enablenav();
    },

    setfullscreenimg : function() {
        if (!Y.one('#mediabox-sidebar-actions .fullscreen')) {
            return;
        }
        var imgurl = M.util.image_url('fullscreen', 'mod_mediagallery');
        if (screenfull.isFullscreen) {
            imgurl = M.util.image_url('fullscreenexit', 'mod_mediagallery');
        }
        Y.one('#mediabox-sidebar-actions .fullscreen').setAttribute('src', imgurl);
    },

    stop : function() {
        if (screenfull.isFullscreen) {
            screenfull.exit();
        }
        this.disablenav();
        Y.one('body').removeClass('noscroll mediaboxactive');
        this.overlay.setStyle('display', '');
        this.mediabox.setStyle('display', '');
    },

    update_likes : function(likes, likedbyme) {
        var str = '';
        if (likes > 0) {
            str = '&nbsp;&bull;&nbsp;';
            str += M.str.mod_mediagallery.likedby+': ';
            if (likedbyme) {
                likes = likes - 1;
                str += M.str.mod_mediagallery.you + ', ';
            }
            str += likes+' ';
            if (likes !== 1) {
                str += M.str.mod_mediagallery.others;
            } else {
                str += M.str.mod_mediagallery.other;
            }
        }
        Y.one('#mediabox-likedby').setHTML(str);
    }

}, {
    NAME : 'moodle-mod_mediagallery-mediabox',
    ATTRS : {
        enablecomments: {
            value : true,
            validator: function(val) {
                return Y.Lang.isBoolean(val);
            }
        },
        enablelikes: {
            value : true,
            validator: function(val) {
                return Y.Lang.isBoolean(val);
            }
        },
        metainfouri: {
            value : '',
            validator: function(val) {
                return Y.Lang.isString(val);
            }
        },
        dataidfield: {
            value : 'data-id',
            validator: function(val) {
                return Y.Lang.isString(val);
            }
        },
        metainfodata: {
            value: {},
            validator: function(val) {
                return Y.Lang.isObject(val);
            }
        }
    }
});

M.mod_mediagallery = M.mod_mediagallery || {};
M.mod_mediagallery.init_mediabox = function(params) {
    return new MEDIABOX(params);
};
