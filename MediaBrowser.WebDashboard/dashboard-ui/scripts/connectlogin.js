﻿define([], function () {

    function login(page, username, password) {

        Dashboard.showModalLoadingMsg();

        ConnectionManager.loginToConnect(username, password).then(function () {

            Dashboard.hideModalLoadingMsg();
            Dashboard.navigate('selectserver.html');

        }, function () {

            Dashboard.hideModalLoadingMsg();

            Dashboard.alert({
                message: Globalize.translate('MessageInvalidUser'),
                title: Globalize.translate('HeaderLoginFailure')
            });

            page.querySelector('#txtManualPassword').value = '';

        });

    }

    function handleConnectionResult(page, result) {

        Dashboard.hideModalLoadingMsg();

        switch (result.State) {

            case MediaBrowser.ConnectionState.SignedIn:
                {
                    var apiClient = result.ApiClient;

                    Dashboard.onServerChanged(apiClient.getCurrentUserId(), apiClient.accessToken(), apiClient);
                    Dashboard.navigate('home.html');
                }
                break;
            case MediaBrowser.ConnectionState.ServerSignIn:
                {
                    Dashboard.navigate('login.html?serverid=' + result.Servers[0].Id, false, 'none');
                }
                break;
            case MediaBrowser.ConnectionState.ServerSelection:
                {
                    Dashboard.navigate('selectserver.html', false, 'none');
                }
                break;
            case MediaBrowser.ConnectionState.ConnectSignIn:
                {
                    loadMode(page, 'welcome');
                }
                break;
            case MediaBrowser.ConnectionState.ServerUpdateNeeded:
                {
                    Dashboard.alert({
                        message: Globalize.translate('ServerUpdateNeeded', '<a href="https://emby.media">https://emby.media</a>')
                    });
                }
                break;
            case MediaBrowser.ConnectionState.Unavailable:
                {
                    Dashboard.alert({
                        message: Globalize.translate("MessageUnableToConnectToServer"),
                        title: Globalize.translate("HeaderConnectionFailure")
                    });
                }
                break;
            default:
                break;
        }
    }

    function loadAppConnection(page) {

        Dashboard.showModalLoadingMsg();

        ConnectionManager.connect().then(function (result) {

            handleConnectionResult(page, result);

        });
    }

    function loadPage(page) {

        var mode = getParameterByName('mode') || 'auto';

        if (mode == 'auto') {

            if (AppInfo.isNativeApp) {
                loadAppConnection(page);
                return;
            }
            mode = 'connect';
        }

        loadMode(page, mode);
    }
    function loadMode(page, mode) {

        if (mode == 'welcome') {

            page.querySelector('.connectLoginForm').classList.add('hide');
            page.querySelector('.welcomeContainer').classList.remove('hide');
            page.querySelector('.manualServerForm').classList.add('hide');
            page.querySelector('.signupForm').classList.add('hide');
        }
        else if (mode == 'connect') {
            page.querySelector('.connectLoginForm').classList.remove('hide');
            page.querySelector('.welcomeContainer').classList.add('hide');
            page.querySelector('.manualServerForm').classList.add('hide');
            page.querySelector('.signupForm').classList.add('hide');
        }
        else if (mode == 'manualserver') {
            page.querySelector('.manualServerForm').classList.remove('hide');
            page.querySelector('.connectLoginForm').classList.add('hide');
            page.querySelector('.welcomeContainer').classList.add('hide');
            page.querySelector('.signupForm').classList.add('hide');
        }
        else if (mode == 'signup') {
            page.querySelector('.manualServerForm').classList.add('hide');
            page.querySelector('.connectLoginForm').classList.add('hide');
            page.querySelector('.welcomeContainer').classList.add('hide');
            page.querySelector('.signupForm').classList.remove('hide');
            initSignup(page);
        }
    }

    function skip() {

        Dashboard.navigate('selectserver.html');
    }

    function requireCaptcha() {
        return !AppInfo.isNativeApp && window.location.href.toLowerCase().indexOf('https') == 0;
    }

    function supportInAppSignup() {
        return AppInfo.isNativeApp;
        return AppInfo.isNativeApp || window.location.href.toLowerCase().indexOf('https') == 0;
    }

    function initSignup(page) {

        if (!supportInAppSignup()) {
            return;
        }

        if (!requireCaptcha()) {
            return;
        }

        require(['https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit'], function () {

        });
    }

    function submitManualServer(page) {

        var host = page.querySelector('#txtServerHost').value;
        var port = page.querySelector('#txtServerPort').value;

        if (port) {
            host += ':' + port;
        }

        Dashboard.showModalLoadingMsg();

        ConnectionManager.connectToAddress(host).then(function (result) {

            handleConnectionResult(page, result);

        }, function () {
            handleConnectionResult(page, {
                State: MediaBrowser.ConnectionState.Unavailable
            });

        });
    }

    function submit(page) {

        var user = page.querySelector('#txtManualName').value;
        var password = page.querySelector('#txtManualPassword').value;

        login(page, user, password);
    }

    return function (view, params) {

        function onSubmit(e) {
            submit(view);

            e.preventDefault();
            return false;
        }

        function onManualServerSubmit(e) {
            submitManualServer(view);

            e.preventDefault();
            return false;
        }

        function onSignupFormSubmit(e) {

            if (!supportInAppSignup()) {
                e.preventDefault();
                return false;
            }

            var page = view;

            ConnectionManager.signupForConnect(page.querySelector('#txtSignupEmail', page).value, page.querySelector('#txtSignupUsername', page).value, page.querySelector('#txtSignupPassword', page).value, page.querySelector('#txtSignupPasswordConfirm', page).value).then(function () {

                Dashboard.alert({
                    message: Globalize.translate('MessageThankYouForConnectSignUp'),
                    callback: function () {
                        Dashboard.navigate('connectlogin.html?mode=welcome');
                    }
                });

            }, function (result) {

                if (result.errorCode == 'passwordmatch') {
                    Dashboard.alert({
                        message: Globalize.translate('ErrorMessagePasswordNotMatchConfirm')
                    });
                }
                else if (result.errorCode == 'USERNAME_IN_USE') {
                    Dashboard.alert({
                        message: Globalize.translate('ErrorMessageUsernameInUse')
                    });
                }
                else if (result.errorCode == 'EMAIL_IN_USE') {
                    Dashboard.alert({
                        message: Globalize.translate('ErrorMessageEmailInUse')
                    });
                } else {
                    Dashboard.alert({
                        message: Globalize.translate('DefaultErrorMessage')
                    });
                }

            });

            e.preventDefault();
            return false;
        }

        view.querySelector('.btnSkipConnect').addEventListener('click', skip);

        view.querySelector('.connectLoginForm').addEventListener('submit', onSubmit);
        view.querySelector('.manualServerForm').addEventListener('submit', onManualServerSubmit);
        view.querySelector('.signupForm').addEventListener('submit', onSignupFormSubmit);

        view.querySelector('.btnSignupForConnect').addEventListener('click', function (e) {
            if (supportInAppSignup()) {
                e.preventDefault();
                e.stopPropagation();
                Dashboard.navigate('connectlogin.html?mode=signup');
                return false;
            }
        });

        view.querySelector('.btnCancelSignup').addEventListener('click', function () {
            history.back();
        });

        view.querySelector('.btnCancelManualServer').addEventListener('click', function () {
            history.back();
        });

        view.querySelector('.btnWelcomeNext').addEventListener('click', function () {
            Dashboard.navigate('connectlogin.html?mode=connect');
        });

        var terms = view.querySelector('.terms');
        terms.innerHTML = Globalize.translate('LoginDisclaimer') + "<div style='margin-top:5px;'><a href='http://emby.media/terms' target='_blank'>" + Globalize.translate('TermsOfUse') + "</a></div>";

        if (AppInfo.isNativeApp) {
            terms.classList.add('hide');
            view.querySelector('.tvAppInfo').classList.add('hide');
        } else {
            terms.classList.remove('hide');
            view.querySelector('.tvAppInfo').classList.remove('hide');
        }

        view.addEventListener('viewbeforeshow', function () {

            var page = this;

            page.querySelector('#txtSignupEmail').value = '';
            page.querySelector('#txtSignupUsername').value = '';
            page.querySelector('#txtSignupPassword').value = '';
            page.querySelector('#txtSignupPasswordConfirm').value = '';

            if (browserInfo.safari && AppInfo.isNativeApp) {
                // With apple we can't even have a link to the site
                page.querySelector('.embyIntroDownloadMessage').innerHTML = Globalize.translate('EmbyIntroDownloadMessageWithoutLink');
            } else {
                var link = '<a href="http://emby.media" target="_blank">http://emby.media</a>';
                page.querySelector('.embyIntroDownloadMessage').innerHTML = Globalize.translate('EmbyIntroDownloadMessage', link);
            }
        });

        view.addEventListener('viewshow', function () {
            loadPage(view);
        });
    };
});