﻿define(['libraryBrowser', 'alphaPicker'], function (libraryBrowser, alphaPicker) {

    return function (view, params) {

        var currentItem;

        var data;

        function getPageData() {
            var pageData = data;

            if (!pageData) {
                pageData = data = {
                    query: {
                        SortBy: "IsFolder,SortName",
                        SortOrder: "Ascending",
                        Fields: "DateCreated,PrimaryImageAspectRatio,MediaSourceCount,SyncInfo",
                        ImageTypeLimit: 1,
                        EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
                        StartIndex: 0,
                        Limit: libraryBrowser.getDefaultPageSize()
                    }
                };

                pageData.query.Filters = "";
                pageData.query.NameStartsWithOrGreater = '';
                var key = getSavedQueryKey();
                pageData.view = libraryBrowser.getSavedView(key) || libraryBrowser.getDefaultItemsView('Poster', 'Poster');

                pageData.query.ParentId = params.parentId || null;
                libraryBrowser.loadSavedQueryValues(key, pageData.query);
            }
            return pageData;
        }

        function getQuery() {

            return getPageData().query;
        }
        function getSavedQueryKey() {

            if (!view.savedQueryKey) {
                view.savedQueryKey = libraryBrowser.getSavedQueryKey('itemsv1');
            }
            return view.savedQueryKey;
        }

        function reloadItems() {

            Dashboard.showLoadingMsg();

            var query = getQuery();
            var userId = Dashboard.getCurrentUserId();

            var parentItemPromise = query.ParentId ?
               ApiClient.getItem(userId, query.ParentId) :
               ApiClient.getRootFolder(userId);

            var itemsPromise = ApiClient.getItems(userId, query);

            Promise.all([parentItemPromise, itemsPromise]).then(function (responses) {

                var item = responses[0];
                currentItem = item;
                var result = responses[1];

                // Scroll back up so they can see the results from the beginning
                window.scrollTo(0, 0);

                var viewStyle = getPageData(view).view;

                var html = '';
                var pagingHtml = libraryBrowser.getQueryPagingHtml({
                    startIndex: query.StartIndex,
                    limit: query.Limit,
                    totalRecordCount: result.TotalRecordCount,
                    showLimit: false,
                    addLayoutButton: false,
                    currentLayout: viewStyle,
                    sortButton: false,
                    filterButton: false
                });

                view.querySelector('.paging').innerHTML = pagingHtml;

                updateFilterControls();

                var context = params.context;

                var posterOptions = {
                    items: result.Items,
                    shape: "auto",
                    centerText: true,
                    lazy: true,
                    coverImage: item.Type == 'PhotoAlbum'
                };

                if (viewStyle == "Backdrop") {

                    posterOptions.shape = 'backdrop';
                    posterOptions.showTitle = true;
                    posterOptions.preferBackdrop = true;

                    html = libraryBrowser.getPosterViewHtml(posterOptions);
                }
                else if (viewStyle == "PosterCard") {

                    posterOptions.showTitle = true;
                    posterOptions.showYear = true;
                    posterOptions.cardLayout = true;
                    posterOptions.centerText = false;

                    html = libraryBrowser.getPosterViewHtml(posterOptions);
                }
                else if (viewStyle == "List") {

                    html = libraryBrowser.getListViewHtml({
                        items: result.Items,
                        sortBy: query.SortBy
                    });
                }
                else if (viewStyle == "Thumb") {

                    posterOptions.preferThumb = true;
                    posterOptions.shape = "backdrop";
                    html = libraryBrowser.getPosterViewHtml(posterOptions);
                } else {

                    // Poster
                    posterOptions.showTitle = context == 'photos' ? 'auto' : true;
                    posterOptions.overlayText = context == 'photos';

                    html = libraryBrowser.getPosterViewHtml(posterOptions);
                }

                if (currentItem.CollectionType == 'boxsets') {
                    view.querySelector('.btnNewCollection').classList.remove('hide');
                    if (!result.Items.length) {
                        html = '<p style="text-align:center;">' + Globalize.translate('MessageNoCollectionsAvailable') + '</p>';
                    }
                } else {
                    view.querySelector('.btnNewCollection').classList.add('hide');
                }

                var elem = view.querySelector('#items');
                elem.innerHTML = html + pagingHtml;
                ImageLoader.lazyChildren(elem);

                var i, length;
                var elems = view.querySelectorAll('.paging');
                for (i = 0, length = elems.length; i < length; i++) {
                    elems[i].innerHTML = pagingHtml;
                }

                function onNextPageClick() {
                    query.StartIndex += query.Limit;
                    reloadItems(view);
                }

                function onPreviousPageClick() {
                    query.StartIndex -= query.Limit;
                    reloadItems(view);
                }

                elems = view.querySelectorAll('.btnNextPage');
                for (i = 0, length = elems.length; i < length; i++) {
                    elems[i].addEventListener('click', onNextPageClick);
                }

                elems = view.querySelectorAll('.btnPreviousPage');
                for (i = 0, length = elems.length; i < length; i++) {
                    elems[i].addEventListener('click', onPreviousPageClick);
                }

                libraryBrowser.saveQueryValues(params.parentId, query);

                var name = item.Name;

                if (item.IndexNumber != null) {
                    name = item.IndexNumber + " - " + name;
                }
                if (item.ParentIndexNumber != null) {
                    name = item.ParentIndexNumber + "." + name;
                }

                LibraryMenu.setTitle(name);

                view.dispatchEvent(new CustomEvent("displayingitem", {
                    detail: {
                        item: item
                    },
                    bubbles: true
                }));

                Dashboard.hideLoadingMsg();
            });
        }

        function showFilterMenu() {

            require(['components/filterdialog/filterdialog'], function (filterDialogFactory) {

                var filterDialog = new filterDialogFactory({
                    query: getQuery()
                });

                Events.on(filterDialog, 'filterchange', function () {
                    reloadItems();
                });

                filterDialog.show();
            });
        }

        var alphaPickerElement = view.querySelector('.alphaPicker');
        alphaPickerElement.addEventListener('alphavaluechanged', function (e) {
            var newValue = e.detail.value;
            var query = getQuery();
            query.NameStartsWithOrGreater = newValue;
            query.StartIndex = 0;
            reloadItems(view);
        });

        self.alphaPicker = new alphaPicker({
            element: alphaPickerElement,
            valueChangeEvent: 'click'
        });

        function parentWithClass(elem, className) {

            while (!elem.classList || !elem.classList.contains(className)) {
                elem = elem.parentNode;

                if (!elem) {
                    return null;
                }
            }

            return elem;
        }

        view.addEventListener('click', function (e) {

            var mediaItem = parentWithClass(e.target, 'mediaItem');
            if (mediaItem) {
                var query = getQuery();
                var info = libraryBrowser.getListItemInfo(mediaItem);

                if (info.mediaType == 'Photo') {
                    require(['scripts/photos'], function () {
                        Photos.startSlideshow(view, query, info.id);
                    });
                    e.preventDefault();
                    return false;
                }
            }
        });

        function updateFilterControls() {

            var query = getQuery();

            self.alphaPicker.value(query.NameStartsWithOrGreater);
        }

        var btnSelectView = view.querySelector('.btnSelectView');
        btnSelectView.addEventListener('click', function (e) {

            libraryBrowser.showLayoutMenu(e.target, getPageData().view, 'List,Poster,PosterCard,Thumb'.split(','));
        });

        btnSelectView.addEventListener('layoutchange', function (e) {
            var layout = e.detail.viewStyle;
            getPageData().view = layout;
            libraryBrowser.saveViewSetting(getSavedQueryKey(), layout);
            reloadItems(view);
        });

        view.querySelector('.btnFilter').addEventListener('click', function () {
            showFilterMenu();
        });

        // On callback make sure to set StartIndex = 0
        view.querySelector('.btnSort').addEventListener('click', function () {
            libraryBrowser.showSortMenu({
                items: [{
                    name: Globalize.translate('OptionNameSort'),
                    id: 'IsFolder,SortName'
                },
                {
                    name: Globalize.translate('OptionCommunityRating'),
                    id: 'CommunityRating,SortName'
                },
                {
                    name: Globalize.translate('OptionCriticRating'),
                    id: 'CriticRating,SortName'
                },
                {
                    name: Globalize.translate('OptionDateAdded'),
                    id: 'DateCreated,SortName'
                },
                {
                    name: Globalize.translate('OptionDatePlayed'),
                    id: 'DatePlayed,SortName'
                },
                {
                    name: Globalize.translate('OptionParentalRating'),
                    id: 'OfficialRating,SortName'
                },
                {
                    name: Globalize.translate('OptionPlayCount'),
                    id: 'PlayCount,SortName'
                },
                {
                    name: Globalize.translate('OptionReleaseDate'),
                    id: 'PremiereDate,SortName'
                },
                {
                    name: Globalize.translate('OptionRuntime'),
                    id: 'Runtime,SortName'
                }],
                callback: function () {
                    reloadItems(view);
                },
                query: getQuery()
            });
        });

        // The button is created dynamically
        view.querySelector('.btnNewCollection').addEventListener('click', function () {

            require(['collectionEditor'], function (collectionEditor) {

                var serverId = ApiClient.serverInfo().Id;
                new collectionEditor().show({
                    items: [],
                    serverId: serverId
                });

            });
        });

        view.addEventListener('viewbeforeshow', function (e) {
            reloadItems(view);
            updateFilterControls();
            LibraryMenu.setBackButtonVisible(params.context);
        });

        view.addEventListener('viewdestroy', function (e) {
            if (self.alphaPicker) {
                self.alphaPicker.destroy();
            }
        });
    };
});