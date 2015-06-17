package com.brm;

/* -*- Mode: java; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import org.mozilla.javascript.Context;
import org.mozilla.javascript.Scriptable;

/**
 * RunScript: simplest example of controlling execution of Rhino.
 *
 * Collects its arguments from the command line, executes the
 * script, and prints the result.
 *
 * @author Norris Boyd
 */
public class RunScript {


    private Scriptable scope;

    public void init(){
        Context context = Context.enter();
        //context.setOptimizationLevel(-1);
        scope = context.initStandardObjects();



        String  s = "new JavaAdapter()";
        context.evaluateString(scope, s, "s", 1, null);



    }


    public static void main(String args[])
    {
        RunScript r = new RunScript();
        r.init();
    }
}


