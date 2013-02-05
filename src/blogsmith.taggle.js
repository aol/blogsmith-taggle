/*global blogsmith:true, _blog_name:true, pageUpdated:true */
(function ($, blogsmith) {

  $(function () {

    $('#tagsidebox').easyTags();

    // Hide the box we must put our plugin inside
    $('div[pluginid=1056]').hide();

  });

  $.widget('aol.easyTags', {

    // default options
    options: {
      namespace: 'aol-easy-tags',
      settings: '-settings', // global key in which to store settings, prefixed by namespace
      sdk: 'blogsmith',
      ui: {
        tagInput: $('#posttags'),
        title: 'Common ' + _blog_name + ' Tags:',
        currentTags: $('#currenttags'),
        admin: {
          title: 'Add, remove, or rearrange common tags for ' + _blog_name,
          help: 'Only owners and editors can change settings. Settings will affect all ' + _blog_name + ' users.',
          off: 'Edit Common Tags',
          on: 'Stop Editing Common Tags'
        }
      }
    },

    _refreshSettings: function () {
      this.settings = this.sdk.getKeyValue(this.options.namespace + this.options.settings) || [];
    },

    _create: function () {
      var ui = this.options.ui;

      this.sdk = window[this.options.sdk];

      // If user is an owner, editor, or support staffer, make them an admin to have advanced functionality
      this.options.bloggerDetails = this.sdk.getBloggerDetails();
      this.options.role = this.options.bloggerDetails.role;

      if (this.options.role === 'Owner' || this.options.role === 'Editor' || this.options.role === 'Support') {
        this.options.admin = true;
      } else {
        this.options.admin = false;
      }

      // Settings should be an ordered array of tag names
      this._refreshSettings();

      ui.tagForm = this.element.find('form');
      ui.header = this.element.find('h2');
      ui.insideBox = this.element.find('.insidebox');

      ui.easyTags = $('<div />', {
        id: 'easyTags'
      }).prependTo(ui.insideBox);
      ui.easyTagList = $('<ul />').addClass('taggle-tag-list');

      if (ui.title) {
        ui.easyTagTitle = $('<h4 />', {
          text: ui.title
        }).appendTo(ui.easyTags);
      }

      if (this.settings && $.isArray(this.settings)) {
        this._populateEasyTags();
      }

      if (ui.easyTagList.children().length <= 0) {
        ui.easyTagTitle.hide();
      }

      this._addEventListeners();

      if (this.options.admin) {
        ui.adminToggle = $('<img />', {
          'class': 'admin-toggle',
          src: 'http://cms.aol.com/bmedia/settings.png',
          title: ui.admin.off
        }).appendTo(ui.header);

        ui.easyTagAdd = $('<img />', {
          'class': 'add',
          src: 'http://o.aolcdn.com/os/blogsmith/plugins/aol-tagger/images/add.png',
          width: '16px',
          height: '16px',
          title: 'Add new tag'
        }).insertAfter(ui.easyTagList).hide();


        if (ui.admin.title) {
          ui.adminTitle = $('<h4 />', {
            text: ui.admin.title
          }).insertBefore(ui.easyTagList).hide();
        }

        if (ui.admin.help) {
          ui.adminHelp = $('<p />', {
            text: ui.admin.help,
            'class': 'help'
          }).insertBefore(ui.easyTagList).hide();
        }
      }

    },

    _populateEasyTags: function () {

      var easyTag, ui;

      ui = this.options.ui;

      this.tags = this.sdk.getTags();

      for (var i = 0, length = this.settings.length; i < length; i += 1) {

        easyTag = $('<li />', {
          text: this.settings[i]
        }).appendTo(ui.easyTagList);

        // Add active class if tag is already present
        if (this.tags.indexOf(this.settings[i]) !== -1) {
          easyTag.addClass('active');
        }

      }

      ui.easyTagList.appendTo(ui.easyTags);

    },

    _clearEasyTags: function () {
      this.options.ui.easyTagList.empty();
    },

    _addEventListeners: function () {

      var ui = this.options.ui,
      sdk = this.sdk;

      ui.easyTagList.delegate('li', 'click', function (e) {

        var remover,
        $tag = $(e.target);

        if ($tag.hasClass('active')) {

          ui.currentTags.children().each(function (i, item) {

            var $item = $(item);

            if ($item.text() === $tag.text()) {
              $item.remove();
              pageUpdated();
            }

            $tag.removeClass('active');

          });

        } else {

          sdk.setTags($tag.text());
          $tag.addClass('active');

          // Blogsmith uses return false on its remove buttons, which prevents event propagation
          // Forces us to play a little bit nasty and unbind their events

          remover = ui.currentTags.children().filter(function () {
            return $(this).text() === $tag.text();
          });

          remover.find('img').unbind('click');

          pageUpdated();

        }

      });

      this.element.delegate('.newremover', 'click', $.proxy(function (e) {
        var $deleteButton = $(e.target);

        ui.easyTagList.children().filter(function () {
          return $(this).text() === $deleteButton.parent().text();
        }).trigger('click');

      }, this));

      // Add an easy tag in admin mode
      this.element.delegate('.add', 'click', $.proxy(function (e) {
        var newTag, tagName,
        easyTags = this._getEasyTags();

        tagName = prompt('Enter the name of the tag you\'d like to add to the list of ' + _blog_name + '\'s common tags.');

        if (tagName) {

          // If new tag is not already an easy tag, create it
          if (easyTags.indexOf(tagName) === -1) {

            newTag = $('<li />', {
              text: tagName
            }).appendTo(ui.easyTagList).hide();

            this._addAdminElements(newTag);
            this._saveEasyTags();

            newTag.fadeIn('fast');

          } else {
            // Otherwise, highlight the currently existing one to make it clear to the user
            ui.easyTagList.find(':contains(' + tagName + ')').effect('highlight');
          }

        }

      }, this));

      // Delete an easy tag in admin mode
      ui.easyTagList.delegate('.delete', 'click', $.proxy(function (e) {

        var activeTag,
        that = this;

        // If there's currently a tag for the easy tag you want to delete, deactivate it first
        activeTag = ui.currentTags.children().filter(function () {
          return $(this).text() === $(e.target).parent().text();
        });

        activeTag.children('.newremover').trigger('click');

        $(e.target).parent().fadeOut('fast', function () {
          $(this).remove();
          that._saveEasyTags();
        });


      }, this));

      if (this.options.admin) {

        this.element.delegate('.admin-toggle', 'click', $.proxy(function (e) {

          var $toggle = $(e.target);
          if (! $toggle.hasClass('active')) {

            $toggle.addClass('active');
            $toggle.attr('title', ui.admin.on);
            this._enableAdmin();


          } else {
            $toggle.removeClass('active');
            $toggle.attr('title', ui.admin.off);
            this._disableAdmin();
          }

        }, this));

      }

      // Here purely to demonstrate craziness in Firefox
      /*
         ui.easyTagList.delegate('.draghandle', 'mouseenter', $.proxy(function ( e) {
         $tag = $(e.currentTarget).parent();
         $tag.width($tag.width());
         }, this));
         */

    },

    _sortEasyTags: function () {

      var ui = this.options.ui;

      ui.easyTagList.sortable({
        // axis: 'y',
        // containment: 'parent',
        // forceHelperSize: true,
        // forcePlaceHolderSize: true,
        handle: '.draghandle',
        opacity: 0.5,
        scrollSpeed: 20,
        // start: function (e, ui) { },
        stop: $.proxy(function (e, ui) {
          // ui.item.parent().removeClass('sort-scope');
          this._saveEasyTags();
        }, this),
        tolerance: 'pointer'
      });

    },

    _enableAdmin: function () {
      var ui = this.options.ui,
      speed = 200;

      ui.easyTagTitle.hide(speed);
      ui.adminTitle.show(speed);
      ui.adminHelp.show(speed);

      ui.easyTagList.hide(speed, $.proxy(function () {

        this._refreshSettings();
        this._clearEasyTags();

        this._populateEasyTags();

        this._sortEasyTags();


        ui.easyTagList.children().each($.proxy(function (i, item) {

          this._addAdminElements($(item));

        }, this));

        ui.easyTagList.show(speed);

        ui.easyTagAdd.show(speed, function () {

          // If there are no easy tags present, automatically trigger the add button
          // This is a lovely feature idea, but I think with the help text we now include,
          // it's more confusing than it is helpful.
          /*
          if (ui.easyTagList.children().length === 0) {
            ui.easyTagAdd.trigger('click');
          }
          */

        });

      }, this));

    },

    _disableAdmin: function () {
      var ui = this.options.ui;

      ui.easyTagAdd.hide('fast');

      ui.adminTitle.hide('fast');
      ui.adminHelp.hide('fast');
      if (ui.easyTagList.children().length > 0) {
        ui.easyTagTitle.show('fast');
      }

      ui.easyTagList.hide('fast', $.proxy(function () {

        ui.easyTagList.sortable('destroy');

        ui.easyTagList.find('.draghandle').remove();
        ui.easyTagList.find('.delete').remove();
        ui.easyTagList.show('fast');

      }, this));
    },

    _addAdminElements: function ($elem) {

      var draghandle, deleteButton;

      draghandle = $('<img />', {
        'class': 'draghandle',
        src: 'http://o.aolcdn.com/os/blogsmith/plugins/aol-tagger/images/draghandle.png',
        width: '12px',
        height: '12px'
      }).prependTo($elem);

      deleteButton = $('<img />', {
        'class': 'delete',
        src: '/bmedia/remtag.png',
        width: '8px',
        height: '8px'
      }).appendTo($elem);

    },

    _getEasyTags: function () {
      var ui = this.options.ui,
      easyTags = [];

      ui.easyTagList.children().each(function (i, item) {
        easyTags.push($(this).text());
      });

      return easyTags;

    },

    _saveEasyTags: function () {
      var newSettings = [];

      this.options.ui.easyTagList.children().each(function (i, item) {
        newSettings.push($(item).text());
      });

      this.sdk.setKeyValue(this.options.namespace + this.options.settings, newSettings);
    },

    _init: function () {
    },

    _destroy: function () {

    }

  });

})(jQuery, blogsmith);
