#include <jni.h>
#include <string>
#include <cstdlib>
#include <pthread.h>
#include <unistd.h>
#include <android/log.h>

#include "node/node.h"

int pipe_stdout[2];
int pipe_stderr[2];
pthread_t thread_stdout;
pthread_t thread_stderr;

const char *ADBTAG = "NODEJS-MOBILE";

void *thread_stderr_func(void *) {
    ssize_t redirect_size;
    char buf[2048];
    while ((redirect_size = read(pipe_stderr[0], buf, sizeof buf - 1)) > 0) {
        //__android_log will add a new line anyway.
        if (buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_ERROR, ADBTAG, buf);
    }

    return nullptr;
}

void *thread_stdout_func(void *) {
    ssize_t redirect_size;
    char buf[2048];
    while ((redirect_size = read(pipe_stdout[0], buf, sizeof buf - 1)) > 0) {
        //__android_log will add a new line anyway.
        if (buf[redirect_size - 1] == '\n')
            --redirect_size;
        buf[redirect_size] = 0;
        __android_log_write(ANDROID_LOG_INFO, ADBTAG, buf);
    }

    return nullptr;
}

int start_redirecting_stdout_stderr() {
    //set stdout as unbuffered.
    setvbuf(stdout, nullptr, _IONBF, 0);
    pipe(pipe_stdout);
    dup2(pipe_stdout[1], STDOUT_FILENO);

    //set stderr as unbuffered.
    setvbuf(stderr, nullptr, _IONBF, 0);
    pipe(pipe_stderr);
    dup2(pipe_stderr[1], STDERR_FILENO);

    pthread_create(&thread_stdout, nullptr, thread_stdout_func, nullptr);
    pthread_detach(thread_stdout);

    pthread_create(&thread_stderr, nullptr, thread_stderr_func, nullptr);
    pthread_detach(thread_stderr);

    return 0;
}

extern "C" JNIEXPORT jint JNICALL
Java_sh_anshu_testwasm_NodeBackgroundTask_startNodeWithArguments(
        JNIEnv *env,
        jobject /* this */,
        jobjectArray arguments) {
    //argc
    jsize argument_count = env->GetArrayLength(arguments);

    //Compute byte size need for all arguments in contiguous memory.
    int c_arguments_size = 0;
    for (int i = 0; i < argument_count; i++) {
        c_arguments_size += std::strlen(
                env->GetStringUTFChars(
                        (jstring) env->GetObjectArrayElement(arguments, i),
                        nullptr
                )
        );
        c_arguments_size++; // for '\0'
    }

    //Stores arguments in contiguous memory.
    char *args_buffer = (char *) calloc(c_arguments_size, sizeof(char));

    //argv to pass into node.
    char *argv[argument_count];

    //To iterate through the expected start position of each argument in args_buffer.
    char *current_args_position = args_buffer;

    //Populate the args_buffer and argv.
    for (int i = 0; i < argument_count; i++) {
        const char *current_argument = env->GetStringUTFChars(
                (jstring) env->GetObjectArrayElement(arguments, i), nullptr
        );

        //Copy current argument to its expected position in args_buffer
        std::strncpy(current_args_position, current_argument, std::strlen(current_argument));

        //Save current argument start position in argv
        argv[i] = current_args_position;

        //Increment to the next argument's expected position.
        current_args_position += std::strlen(current_args_position) + 1;
    }

    //Start threads to show stdout and stderr in logcat.
    start_redirecting_stdout_stderr();

    //Start node, with argc and argv.
    return jint(node::Start(argument_count, argv));
}